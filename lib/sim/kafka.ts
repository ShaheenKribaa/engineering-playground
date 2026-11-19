import { fail, hashNumber, ok, type SimulationResult, type Simulator } from './types'

export interface KafkaMessage {
  key: string
  value: string
  offset: number
  partition: number
}

export interface KafkaPartition {
  id: number
  leader: number
  log: KafkaMessage[]
}

export interface KafkaTopic {
  name: string
  partitions: KafkaPartition[]
}

export interface ConsumerGroup {
  id: string
  members: string[]
  assignment: Record<string, number[]>
  committed: Record<number, number>
}

export interface KafkaState {
  brokers: number[]
  topic: KafkaTopic | null
  groups: ConsumerGroup[]
  failedBrokers?: number[]
}

export type KafkaAction =
  | { type: 'createTopic'; name: string; partitions: number }
  | { type: 'produce'; key: string; value: string }
  | { type: 'join'; group: string; member: string }
  | { type: 'poll'; group: string; max?: number }
  | { type: 'failBroker'; broker: number }
  | { type: 'recoverBroker'; broker: number }
  | { type: 'electLeader'; partition: number; leader: number }

export type KafkaEvent =
  | { type: 'TOPIC_CREATED'; name: string }
  | { type: 'MESSAGE_PRODUCED'; partition: number; offset: number }
  | { type: 'REBALANCED'; group: string }
  | { type: 'CONSUMED'; group: string; member: string; partition: number; offset: number }
  | { type: 'BROKER_FAILED'; broker: number }
  | { type: 'BROKER_RECOVERED'; broker: number }
  | { type: 'LEADER_ELECTED'; partition: number; leader: number }

type Result = SimulationResult<KafkaState, KafkaEvent>

export function partitionFor(key: string, count: number) {
  return hashNumber(key) % count
}

/** Range assignor: contiguous partition ranges per sorted member. */
function rangeAssign(members: string[], partitions: number): Record<string, number[]> {
  const sorted = [...members].sort()
  const per = Math.floor(partitions / sorted.length)
  const extra = partitions % sorted.length
  const assignment: Record<string, number[]> = {}
  let next = 0
  sorted.forEach((m, i) => {
    const n = per + (i < extra ? 1 : 0)
    assignment[m] = Array.from({ length: n }, (_, k) => next + k)
    next += n
  })
  return assignment
}

export function groupLag(state: KafkaState, group: ConsumerGroup) {
  if (!state.topic) return 0
  return state.topic.partitions.reduce((sum, p) => sum + (p.log.length - (group.committed[p.id] ?? 0)), 0)
}

export const kafkaSimulator: Simulator<KafkaState, KafkaAction, KafkaEvent, { brokers: number }> = {
  id: 'kafka',
  version: '1.0.0',

  initialize(config) {
    return {
      brokers: Array.from({ length: config.brokers }, (_, i) => i + 1),
      topic: null,
      groups: [],
    }
  },

  execute(state, action): Result {
    switch (action.type) {
      case 'createTopic': {
        if (state.topic) return fail(state, 'TOPIC_EXISTS', `Topic '${state.topic.name}' already exists.`)
        const partitions = Array.from({ length: action.partitions }, (_, id) => ({
          id,
          leader: state.brokers[id % state.brokers.length],
          log: [],
        }))
        return ok(
          { ...state, topic: { name: action.name, partitions } },
          [{ type: 'TOPIC_CREATED', name: action.name }],
          `Created topic ${action.name} (partitions=${action.partitions}, leaders=${partitions
            .map((p) => `b${p.leader}`)
            .join(',')})`,
        )
      }

      case 'produce': {
        const topic = state.topic
        if (!topic) return fail(state, 'UNKNOWN_TOPIC', 'UNKNOWN_TOPIC_OR_PARTITION')
        const p = partitionFor(action.key, topic.partitions.length)
        const partition = topic.partitions[p]
        const message: KafkaMessage = { key: action.key, value: action.value, offset: partition.log.length, partition: p }
        const partitions = topic.partitions.map((x) => (x.id === p ? { ...x, log: [...x.log, message] } : x))
        return ok(
          { ...state, topic: { ...topic, partitions } },
          [{ type: 'MESSAGE_PRODUCED', partition: p, offset: message.offset }],
          `ack: ${topic.name}-${p}@${message.offset}  (hash("${action.key}") % ${topic.partitions.length} = ${p})`,
        )
      }

      case 'join': {
        const topic = state.topic
        if (!topic) return fail(state, 'UNKNOWN_TOPIC', 'No topic to subscribe to')
        const existing = state.groups.find((g) => g.id === action.group)
        const members = [...(existing?.members ?? []), action.member]
        const group: ConsumerGroup = {
          id: action.group,
          members,
          assignment: rangeAssign(members, topic.partitions.length),
          committed: existing?.committed ?? Object.fromEntries(topic.partitions.map((p) => [p.id, 0])),
        }
        const groups = existing
          ? state.groups.map((g) => (g.id === action.group ? group : g))
          : [...state.groups, group]
        const summary = members
          .map((m) => `${m}→${group.assignment[m].length ? group.assignment[m].map((p) => `P${p}`).join(',') : 'idle'}`)
          .join('  ')
        return ok(
          { ...state, groups },
          [{ type: 'REBALANCED', group: action.group }],
          `${existing ? 'Rebalance' : 'Joined'} ${action.group}: ${summary}`,
        )
      }

      case 'poll': {
        const topic = state.topic
        const group = state.groups.find((g) => g.id === action.group)
        if (!topic || !group) return fail(state, 'UNKNOWN_GROUP', `Group '${action.group}' has no members`)
        const committed = { ...group.committed }
        const events: KafkaEvent[] = []
        for (const member of group.members) {
          for (const p of group.assignment[member]) {
            const log = topic.partitions[p].log
            let read = 0
            while (committed[p] < log.length && read < (action.max ?? Infinity)) {
              events.push({ type: 'CONSUMED', group: group.id, member, partition: p, offset: committed[p] })
              committed[p]++
              read++
            }
          }
        }
        const next = { ...state, groups: state.groups.map((g) => (g.id === group.id ? { ...g, committed } : g)) }
        return ok(
          next,
          events,
          events.length
            ? `${group.id} consumed ${events.length} record${events.length === 1 ? '' : 's'}; committed ${Object.entries(
                committed,
              )
                .map(([p, o]) => `P${p}=${o}`)
                .join(' ')}`
            : `${group.id}: no new records`,
        )
      }

      case 'failBroker': {
        const failed = new Set(state.failedBrokers ?? [])
        failed.add(action.broker)
        const failedList = Array.from(failed)
        const aliveBrokers = state.brokers.filter((b) => !failed.has(b))
        const events: KafkaEvent[] = [{ type: 'BROKER_FAILED', broker: action.broker }]
        
        let nextTopic = state.topic
        if (nextTopic && aliveBrokers.length > 0) {
          const nextPartitions = nextTopic.partitions.map((p) => {
            if (p.leader === action.broker) {
              const newLeader = aliveBrokers[p.id % aliveBrokers.length]
              events.push({ type: 'LEADER_ELECTED', partition: p.id, leader: newLeader })
              return { ...p, leader: newLeader }
            }
            return p
          })
          nextTopic = { ...nextTopic, partitions: nextPartitions }
        }
        return ok(
          { ...state, failedBrokers: failedList, topic: nextTopic },
          events,
          `Broker ${action.broker} failed. Leader failover completed to surviving brokers.`,
        )
      }

      case 'recoverBroker': {
        const failed = (state.failedBrokers ?? []).filter((b) => b !== action.broker)
        return ok(
          { ...state, failedBrokers: failed },
          [{ type: 'BROKER_RECOVERED', broker: action.broker }],
          `Broker ${action.broker} recovered and rejoined the cluster.`,
        )
      }

      case 'electLeader': {
        if (!state.topic) return fail(state, 'NO_TOPIC', 'No active topic.')
        const nextPartitions = state.topic.partitions.map((p) =>
          p.id === action.partition ? { ...p, leader: action.leader } : p,
        )
        return ok(
          { ...state, topic: { ...state.topic, partitions: nextPartitions } },
          [{ type: 'LEADER_ELECTED', partition: action.partition, leader: action.leader }],
          `Elected broker-${action.leader} as leader for partition ${action.partition}.`,
        )
      }
    }
  },
}

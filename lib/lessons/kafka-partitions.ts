import { groupLag, kafkaSimulator, type KafkaAction, type KafkaEvent, type KafkaState } from '@/lib/sim/kafka'
import type { Lesson, StepAction } from './types'

const produce = (key: string, id: number): StepAction<KafkaAction> => ({
  cmd: `kcat -P -t orders -k ${key} '{"order":${id}}'`,
  action: { type: 'produce', key, value: `#${id}` },
})

const join = (group: string, member: string): StepAction<KafkaAction> => ({
  cmd: `kcat -G ${group} orders   # ${member} joins`,
  action: { type: 'join', group, member },
})

const poll = (group: string): StepAction<KafkaAction> => ({
  cmd: `${group}.poll() → commit offsets`,
  action: { type: 'poll', group },
})

export const kafkaPartitionsLesson: Lesson<KafkaState, KafkaAction, KafkaEvent> = {
  id: 'kafka-partitions',
  domainId: 'kafka',
  title: 'Topics, Partitions & Offsets',
  subtitle: 'Follow order events from producer to consumer group, and see why Kafka scales by partition.',
  minutes: 15,
  level: 'Intermediate',
  simulator: kafkaSimulator,
  config: { brokers: 3 },
  legend: [
    { label: 'record', tone: 'yellow' },
    { label: 'billing offset', tone: 'green' },
    { label: 'analytics offset', tone: 'lavender' },
  ],
  learn: [
    { text: 'A topic is split into ordered partitions', step: 2 },
    { text: 'The key decides the partition', step: 4 },
    { text: 'Offsets track each group’s position', step: 5 },
    { text: 'Consumers scale up to the partition count', step: 7 },
    { text: 'Groups read independently; lag is the backlog', step: 9 },
  ],
  metrics: (s) => {
    const messages = s.topic?.partitions.reduce((n, p) => n + p.log.length, 0) ?? 0
    const lag = s.groups.reduce((n, g) => n + groupLag(s, g), 0)
    return [
      { label: 'Partitions', value: String(s.topic?.partitions.length ?? 0), icon: 'partition' },
      { label: 'Records', value: String(messages), icon: 'message' },
      { label: 'Consumer lag', value: String(lag), icon: 'lag', highlight: lag > 0 },
      { label: 'Groups', value: String(s.groups.length), icon: 'group' },
    ]
  },
  steps: [
    {
      label: 'Cluster',
      title: 'An event log, not a queue',
      tag: 'CONCEPT',
      body: [
        'The `shop` checkout must notify billing, shipping and analytics about every order. Calling each service directly couples them together.',
        'Kafka stores events in an **append-only log** spread across brokers. Producers write; any number of consumers read at their own pace.',
      ],
      keyIdea: 'Reading a record does not delete it. The log keeps records for a retention period.',
      changes: [{ kind: 'add', text: '3 brokers' }],
      actions: [],
    },
    {
      label: 'Topic',
      title: 'Create a partitioned topic',
      tag: 'TECHNIQUE',
      body: [
        'A **topic** is a named stream, split into **partitions**. Each partition is an ordered log that lives on one leader broker.',
        'Spreading partitions over brokers is how Kafka spreads load: more partitions, more parallelism.',
      ],
      keyIdea: 'The partition, not the topic, is Kafka’s unit of ordering and parallelism.',
      changes: [
        { kind: 'add', text: 'Topic orders' },
        { kind: 'add', text: 'P0, P1, P2 on brokers 1–3' },
      ],
      actions: [
        {
          cmd: 'kafka-topics.sh --create --topic orders --partitions 3',
          action: { type: 'createTopic', name: 'orders', partitions: 3 },
        },
      ],
    },
    {
      label: 'Produce',
      title: 'Produce some orders',
      tag: 'TECHNIQUE',
      body: [
        'The checkout service produces one record per order. Each record has a **key** (the user) and a value.',
        'The producer hashes the key to pick a partition. Inside a partition every record gets the next **offset**.',
      ],
      keyIdea: '`partition = hash(key) % partitions` — same key, same partition, every time.',
      changes: [{ kind: 'add', text: '3 records appended' }],
      actions: [produce('user-42', 1001), produce('user-19', 1002), produce('user-88', 1003)],
    },
    {
      label: 'Keys',
      title: 'Same key, same partition',
      tag: 'CONCEPT',
      body: [
        '`user-42` places three more orders. All of them land in the same partition, in the order they were sent.',
        'That is Kafka’s ordering guarantee: **ordered within a partition**, not across the whole topic.',
      ],
      keyIdea: 'Choose keys so that events that must stay in order share a key.',
      changes: [{ kind: 'add', text: '3 records for user-42' }],
      actions: [produce('user-42', 1004), produce('user-42', 1005), produce('user-42', 1006)],
    },
    {
      label: 'Consume',
      title: 'A consumer reads and commits',
      tag: 'TECHNIQUE',
      body: [
        'The billing service joins **consumer group** `billing` with one consumer, `c1`. It is assigned all three partitions.',
        'After processing, it **commits** its offset per partition — a bookmark meaning “everything before this is done”.',
      ],
      keyIdea: 'Kafka does not track which messages were read; each group tracks its own offsets.',
      changes: [
        { kind: 'add', text: 'Group billing (c1 → P0–P2)' },
        { kind: 'mod', text: 'Offsets committed' },
      ],
      actions: [join('billing', 'c1'), poll('billing')],
    },
    {
      label: 'Scale',
      title: 'Add consumers to scale',
      tag: 'TECHNIQUE',
      body: [
        'Black Friday: orders pour in and `c1` falls behind. You start `c2` and `c3` in the same group.',
        'The group **rebalances**: each partition goes to exactly one consumer, so the three share the work.',
      ],
      keyIdea: 'Within a group, a partition is consumed by at most one member at a time.',
      changes: [
        { kind: 'add', text: '3 records' },
        { kind: 'mod', text: 'Rebalance: 1 partition per consumer' },
      ],
      actions: [
        produce('user-7', 1007),
        produce('user-5', 1008),
        produce('user-19', 1009),
        join('billing', 'c2'),
        join('billing', 'c3'),
        poll('billing'),
      ],
    },
    {
      label: 'Idle',
      title: 'More consumers than partitions',
      tag: 'PITFALL',
      body: [
        'Hoping for more speed, you add `c4`. After the rebalance it is assigned **nothing**.',
        'With three partitions, at most three consumers in a group do work. To scale further, add partitions.',
      ],
      keyIdea: 'Partition count caps consumer parallelism per group. Plan it up front.',
      changes: [{ kind: 'add', text: 'c4 joins — idle' }],
      actions: [join('billing', 'c4')],
    },
    {
      label: 'Replay',
      title: 'A second group reads everything',
      tag: 'CONCEPT',
      body: [
        'The analytics team starts group `analytics`. It begins at offset 0 and reads the full history.',
        'Billing’s offsets are untouched. Each group is an **independent reader** of the same log.',
      ],
      keyIdea: 'Adding a new consumer group requires no change to the producer.',
      changes: [
        { kind: 'add', text: 'Group analytics' },
        { kind: 'mod', text: 'analytics read all 9 records' },
      ],
      actions: [join('analytics', 'a1'), poll('analytics')],
    },
    {
      label: 'Lag',
      title: 'Watch the lag',
      tag: 'PITFALL',
      body: [
        'New orders arrive, but neither group has polled yet. The gap between the log end and the committed offset is **consumer lag**.',
        'Billing catches up, analytics stays behind. Lag is the first metric to alert on.',
      ],
      keyIdea: 'Lag growing steadily means consumers cannot keep up with producers.',
      changes: [
        { kind: 'add', text: '3 new records' },
        { kind: 'mod', text: 'billing caught up' },
        { kind: 'mod', text: 'analytics lag = 3' },
      ],
      actions: [produce('user-42', 1010), produce('user-88', 1011), produce('user-7', 1012), poll('billing')],
    },
    {
      label: 'Recap',
      title: 'What you learned',
      tag: 'RECAP',
      body: [
        'Topics are split into partitions; keys route records; offsets mark each group’s progress.',
        'Groups scale out up to the partition count and read independently. Next: **replication** — what happens when a broker dies.',
      ],
      keyIdea: 'Kafka is a durable, replayable log. Consumers move bookmarks; the data stays.',
      actions: [],
    },
  ],
}

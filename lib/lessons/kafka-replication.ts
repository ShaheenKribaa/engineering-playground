import { groupLag, kafkaSimulator, type KafkaAction, type KafkaEvent, type KafkaState } from '@/lib/sim/kafka'
import type { Lesson } from './types'

export const kafkaReplicationLesson: Lesson<KafkaState, KafkaAction, KafkaEvent> = {
  id: 'kafka-replication',
  domainId: 'kafka',
  title: 'Replication & Failover',
  subtitle: 'Understand partition leaders, followers, in-sync replicas (ISR), and automatic leader failover.',
  minutes: 15,
  level: 'Advanced',
  simulator: kafkaSimulator,
  config: { brokers: 3 },
  legend: [
    { label: 'record', tone: 'yellow' },
    { label: 'leader partition', tone: 'blue' },
    { label: 'consumer offset', tone: 'green' },
    { label: 'broker alert', tone: 'orange' },
  ],
  learn: [
    { text: 'Replication factor guarantees fault tolerance across brokers', step: 1 },
    { text: 'Every partition has exactly one leader and multiple follower replicas', step: 2 },
    { text: 'Producers and consumers communicate directly with partition leaders', step: 3 },
    { text: 'Broker failure triggers automatic leader election from the ISR', step: 5 },
    { text: 'Recovered brokers catch up on missed offsets and rejoin the ISR', step: 6 },
  ],
  metrics: (s) => {
    const messages = s.topic?.partitions.reduce((n, p) => n + p.log.length, 0) ?? 0
    const activeBrokers = s.brokers.length - (s.failedBrokers?.length ?? 0)
    const lag = s.groups.reduce((n, g) => n + groupLag(s, g), 0)
    return [
      { label: 'Live Brokers', value: `${activeBrokers}/${s.brokers.length}`, icon: 'group', highlight: activeBrokers < s.brokers.length },
      { label: 'Partitions', value: String(s.topic?.partitions.length ?? 0), icon: 'partition' },
      { label: 'Records', value: String(messages), icon: 'message' },
      { label: 'Consumer Lag', value: String(lag), icon: 'lag' },
    ]
  },
  steps: [
    {
      label: 'Concept',
      title: 'Why replicate partitions?',
      tag: 'CONCEPT',
      body: [
        'Hardware crashes, operating systems restart, and cloud instances get terminated. If a broker holding a partition dies without replication, that partition goes offline and data is temporarily inaccessible.',
        'Kafka solves this through **partition replication**: each partition is duplicated across multiple broker nodes.',
      ],
      keyIdea: 'Replication ensures high availability and zero data loss in distributed event streaming.',
      actions: [],
    },
    {
      label: 'Topic',
      title: 'Topic with replication factor 3',
      tag: 'TECHNIQUE',
      body: [
        'We create an `orders` topic with 3 partitions distributed across our 3 brokers.',
        'For each partition, one broker is designated as the **Leader**, while the other brokers act as **Follower Replicas**.',
      ],
      keyIdea: 'Leaders handle all read and write requests. Followers replicate data in the background.',
      changes: [{ kind: 'add', text: 'Topic orders (3 partitions, brokers 1..3)' }],
      actions: [
        {
          cmd: 'kafka-topics.sh --create --topic orders --partitions 3 --replication-factor 3',
          action: { type: 'createTopic', name: 'orders', partitions: 3 },
        },
      ],
    },
    {
      label: 'Produce',
      title: 'Producing to the leader',
      tag: 'TECHNIQUE',
      body: [
        'When a producer sends records with partition keys `cust-100`, `cust-200`, and `cust-300`, Kafka routes each message to the partition leader.',
        'Followers pull the records from the leader to keep their local log identical.',
      ],
      keyIdea: 'A replica that is fully caught up with the leader is part of the In-Sync Replicas (ISR) set.',
      changes: [{ kind: 'add', text: '3 records across partitions P0, P1, P2' }],
      actions: [
        {
          cmd: 'kafka-console-producer.sh --topic orders --property parse.key=true (cust-100)',
          action: { type: 'produce', key: 'cust-100', value: 'order-101' },
        },
        {
          cmd: 'kafka-console-producer.sh --topic orders --property parse.key=true (cust-200)',
          action: { type: 'produce', key: 'cust-200', value: 'order-102' },
        },
        {
          cmd: 'kafka-console-producer.sh --topic orders --property parse.key=true (cust-300)',
          action: { type: 'produce', key: 'cust-300', value: 'order-103' },
        },
      ],
    },
    {
      label: 'Consumers',
      title: 'Consumer group streaming',
      tag: 'TECHNIQUE',
      body: [
        'The `fulfillment` consumer group joins the topic and starts consuming records.',
        'Notice how offsets advance as records are consumed and committed.',
      ],
      keyIdea: 'Consumers only read messages that have been committed by all in-sync replicas.',
      changes: [{ kind: 'add', text: 'Group fulfillment joined and polled' }],
      actions: [
        {
          cmd: 'kafka-console-consumer.sh --topic orders --group fulfillment (worker-1)',
          action: { type: 'join', group: 'fulfillment', member: 'worker-1' },
        },
        {
          cmd: 'kafka-console-consumer.sh --topic orders --group fulfillment (worker-2)',
          action: { type: 'join', group: 'fulfillment', member: 'worker-2' },
        },
        {
          cmd: 'fulfillment.poll()',
          action: { type: 'poll', group: 'fulfillment' },
        },
      ],
    },
    {
      label: 'Failover',
      title: 'Broker failure & leader election',
      tag: 'PITFALL',
      body: [
        'Disaster strikes: Broker 1 suddenly crashes! Any partition where Broker 1 was the leader loses its active leader.',
        'The Kafka Controller immediately detects the heartbeat loss, removes Broker 1 from the ISR, and elects an in-sync follower to become the new partition leader.',
      ],
      keyIdea: 'Leader election happens in milliseconds, allowing client traffic to continue without manual intervention.',
      changes: [
        { kind: 'del', text: 'Broker 1 offline' },
        { kind: 'mod', text: 'New partition leader elected' },
      ],
      actions: [
        {
          cmd: 'systemctl stop kafka (on broker-1)',
          action: { type: 'failBroker', broker: 1 },
        },
      ],
    },
    {
      label: 'Continuity',
      title: 'Writes continue during outage',
      tag: 'TECHNIQUE',
      body: [
        'Even with Broker 1 completely offline, producers can still write to the cluster because surviving brokers are handling the partitions.',
        'Data availability is maintained.',
      ],
      keyIdea: 'As long as an In-Sync Replica is alive, the partition remains readable and writable.',
      changes: [{ kind: 'add', text: 'New record written during broker outage' }],
      actions: [
        {
          cmd: 'kafka-console-producer.sh --topic orders (cust-400)',
          action: { type: 'produce', key: 'cust-400', value: 'order-104' },
        },
      ],
    },
    {
      label: 'Recovery',
      title: 'Broker restart & ISR catch-up',
      tag: 'TECHNIQUE',
      body: [
        'Broker 1 is rebooted and comes back online. It connects to the cluster as a follower, fetches the records it missed while offline, and rejoins the In-Sync Replicas.',
      ],
      keyIdea: 'Replicas automatically resynchronize logs upon recovery.',
      changes: [{ kind: 'add', text: 'Broker 1 online and synchronized' }],
      actions: [
        {
          cmd: 'systemctl start kafka (on broker-1)',
          action: { type: 'recoverBroker', broker: 1 },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Summary',
      tag: 'RECAP',
      body: [
        'Replication factor determines how many broker failures a partition can tolerate (`N - 1` toleration for `N` replicas with `min.insync.replicas=1`).',
        'In production, a replication factor of 3 with `min.insync.replicas=2` and `acks=all` is the golden standard for zero data loss.',
      ],
      keyIdea: 'Leaders serve traffic; followers provide redundancy; controllers orchestrate failover.',
      actions: [],
    },
  ],
}

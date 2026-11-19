import { dockerContainersLesson } from './docker-containers'
import { dockerComposeLesson } from './docker-compose'
import { gitBranchingLesson } from './git-branching'
import { gitRebaseLesson } from './git-rebase'
import { gitConflictsLesson } from './git-conflicts'
import { gitCherryPickLesson } from './git-cherry-pick'
import { kafkaPartitionsLesson } from './kafka-partitions'
import { kafkaReplicationLesson } from './kafka-replication'
import { k8sPodsLesson } from './k8s-pods'
import { k8sServicesLesson } from './k8s-services'
import { netDnsLesson } from './net-dns'
import { netTcpLesson } from './net-tcp'
import { cicdPipelinesLesson } from './cicd-pipelines'
import type { Lesson, Tone } from './types'

export interface CatalogLesson {
  id: string
  title: string
  playable: boolean
}

export interface Domain {
  id: string
  title: string
  tone: Tone
  lessons: CatalogLesson[]
}

export const lessons: Record<string, Lesson> = {
  [gitBranchingLesson.id]: gitBranchingLesson,
  [gitRebaseLesson.id]: gitRebaseLesson,
  [gitConflictsLesson.id]: gitConflictsLesson,
  [gitCherryPickLesson.id]: gitCherryPickLesson,
  [dockerContainersLesson.id]: dockerContainersLesson,
  [dockerComposeLesson.id]: dockerComposeLesson,
  [kafkaPartitionsLesson.id]: kafkaPartitionsLesson,
  [kafkaReplicationLesson.id]: kafkaReplicationLesson,
  [k8sPodsLesson.id]: k8sPodsLesson,
  [k8sServicesLesson.id]: k8sServicesLesson,
  [netDnsLesson.id]: netDnsLesson,
  [netTcpLesson.id]: netTcpLesson,
  [cicdPipelinesLesson.id]: cicdPipelinesLesson,
}

export const domains: Domain[] = [
  {
    id: 'git',
    title: 'Git',
    tone: 'orange',
    lessons: [
      { id: 'git-branching', title: 'Branching & Merging', playable: true },
      { id: 'git-rebase', title: 'Rebase, Step by Step', playable: true },
      { id: 'git-conflicts', title: 'Resolving Conflicts', playable: true },
      { id: 'git-cherry-pick', title: 'Cherry-Pick & Stashing', playable: true },
    ],
  },
  {
    id: 'docker',
    title: 'Docker',
    tone: 'blue',
    lessons: [
      { id: 'docker-containers', title: 'From Image to Container', playable: true },
      { id: 'docker-compose', title: 'Compose Multi-Service Apps', playable: true },
    ],
  },
  {
    id: 'kafka',
    title: 'Kafka',
    tone: 'lavender',
    lessons: [
      { id: 'kafka-partitions', title: 'Topics, Partitions & Offsets', playable: true },
      { id: 'kafka-replication', title: 'Replication & Failover', playable: true },
    ],
  },
  {
    id: 'kubernetes',
    title: 'Kubernetes',
    tone: 'green',
    lessons: [
      { id: 'k8s-pods', title: 'Pods & Deployments', playable: true },
      { id: 'k8s-services', title: 'Services & Scheduling', playable: true },
    ],
  },
  {
    id: 'networking',
    title: 'Networking',
    tone: 'yellow',
    lessons: [
      { id: 'net-dns', title: 'DNS Resolution', playable: true },
      { id: 'net-tcp', title: 'TCP & TLS Handshakes', playable: true },
    ],
  },
  {
    id: 'cicd',
    title: 'CI/CD',
    tone: 'pink',
    lessons: [{ id: 'cicd-pipelines', title: 'Pipelines & Artifacts', playable: true }],
  },
]

export const playableLessonIds = domains.flatMap((d) => d.lessons.filter((l) => l.playable).map((l) => l.id))

export function findDomain(domainId: string) {
  return domains.find((d) => d.id === domainId)
}

export function lessonPosition(lessonId: string) {
  const domainIndex = domains.findIndex((d) => d.lessons.some((l) => l.id === lessonId))
  const domain = domains[domainIndex]
  const lessonIndex = domain?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  return { domain, domainIndex, lessonIndex }
}

export function nextPlayableLesson(lessonId: string) {
  const i = playableLessonIds.indexOf(lessonId)
  return i >= 0 ? playableLessonIds[i + 1] : undefined
}

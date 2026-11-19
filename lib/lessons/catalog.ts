import { dockerContainersLesson } from './docker-containers'
import { gitBranchingLesson } from './git-branching'
import { kafkaPartitionsLesson } from './kafka-partitions'
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
  [dockerContainersLesson.id]: dockerContainersLesson,
  [kafkaPartitionsLesson.id]: kafkaPartitionsLesson,
}

export const domains: Domain[] = [
  {
    id: 'git',
    title: 'Git',
    tone: 'orange',
    lessons: [
      { id: 'git-branching', title: 'Branching & Merging', playable: true },
      { id: 'git-rebase', title: 'Rebase, Step by Step', playable: false },
      { id: 'git-conflicts', title: 'Resolving Conflicts', playable: false },
    ],
  },
  {
    id: 'docker',
    title: 'Docker',
    tone: 'blue',
    lessons: [
      { id: 'docker-containers', title: 'From Image to Container', playable: true },
      { id: 'docker-compose', title: 'Compose Multi-Service Apps', playable: false },
    ],
  },
  {
    id: 'kafka',
    title: 'Kafka',
    tone: 'lavender',
    lessons: [
      { id: 'kafka-partitions', title: 'Topics, Partitions & Offsets', playable: true },
      { id: 'kafka-replication', title: 'Replication & Failover', playable: false },
    ],
  },
  {
    id: 'kubernetes',
    title: 'Kubernetes',
    tone: 'green',
    lessons: [
      { id: 'k8s-pods', title: 'Pods & Deployments', playable: false },
      { id: 'k8s-services', title: 'Services & Scheduling', playable: false },
    ],
  },
  {
    id: 'networking',
    title: 'Networking',
    tone: 'yellow',
    lessons: [
      { id: 'net-dns', title: 'DNS Resolution', playable: false },
      { id: 'net-tcp', title: 'TCP & TLS Handshakes', playable: false },
    ],
  },
  {
    id: 'cicd',
    title: 'CI/CD',
    tone: 'pink',
    lessons: [{ id: 'cicd-pipelines', title: 'Pipelines & Artifacts', playable: false }],
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

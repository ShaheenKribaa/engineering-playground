import type { Simulator } from '@/lib/sim/types'

export type StepTag = 'CONCEPT' | 'TECHNIQUE' | 'PITFALL' | 'PRACTICE' | 'RECAP'
export type Tone = 'green' | 'yellow' | 'lavender' | 'blue' | 'orange' | 'pink'
export type MetricIcon =
  | 'commit'
  | 'branch'
  | 'head'
  | 'activity'
  | 'image'
  | 'container'
  | 'network'
  | 'volume'
  | 'partition'
  | 'message'
  | 'lag'
  | 'group'

export interface StepAction<A> {
  cmd: string
  action: A
}

export interface StepChange {
  kind: 'add' | 'mod' | 'del'
  text: string
}

export interface LessonStep<A> {
  label: string
  title: string
  tag: StepTag
  /** Paragraphs. Supports `code` and **highlighted term** markup. */
  body: string[]
  keyIdea?: string
  changes?: StepChange[]
  actions: StepAction<A>[]
  sandbox?: boolean
}

export interface Metric {
  label: string
  value: string
  icon: MetricIcon
  highlight?: boolean
}

export interface Lesson<S = any, A = any, E = any> {
  id: string
  domainId: string
  title: string
  subtitle: string
  minutes: number
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  simulator: Simulator<S, A, E, any>
  config: unknown
  steps: LessonStep<A>[]
  learn: { text: string; step: number }[]
  metrics: (state: S) => Metric[]
  legend: { label: string; tone: Tone }[]
  parse?: (input: string) => A | { error: string }
  sandboxHints?: string[]
}

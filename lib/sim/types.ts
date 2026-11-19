export interface SimulationResult<S, E> {
  nextState: S
  events: E[]
  status: 'success' | 'failure'
  feedback?: string
  errorCode?: string
}

export interface Simulator<TState, TAction, TEvent, TConfig = unknown> {
  readonly id: string
  readonly version: string
  initialize(config: TConfig): TState
  execute(state: TState, action: TAction): SimulationResult<TState, TEvent>
}

export function ok<S, E>(nextState: S, events: E[], feedback?: string): SimulationResult<S, E> {
  return { nextState, events, status: 'success', feedback }
}

export function fail<S, E>(state: S, errorCode: string, feedback: string): SimulationResult<S, E> {
  return { nextState: state, events: [], status: 'failure', errorCode, feedback }
}

/** Deterministic FNV-1a hash, rendered as short hex. */
export function shortHash(input: string, length = 7): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  let out = (h >>> 0).toString(16).padStart(8, '0')
  let h2 = h
  while (out.length < length) {
    h2 = Math.imul(h2 ^ 0x9e3779b9, 0x01000193)
    out += (h2 >>> 0).toString(16).padStart(8, '0')
  }
  return out.slice(0, length)
}

export function hashNumber(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

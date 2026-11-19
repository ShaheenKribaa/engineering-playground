import type { Lesson } from '@/lib/lessons/types'

export interface Frame<S = unknown, E = unknown> {
  state: S
  events: E[]
  cmd?: string
  feedback?: string
  status?: 'success' | 'failure'
}

const cache = new WeakMap<Lesson, Frame[][]>()

/**
 * Reduce the lesson's action sequence into frames, grouped per step.
 * frames[step][0] is the state the step starts from; each following frame is one executed action.
 */
export function buildTimeline(lesson: Lesson): Frame[][] {
  const cached = cache.get(lesson)
  if (cached) return cached

  let state = lesson.simulator.initialize(lesson.config)
  const timeline = lesson.steps.map((step) => {
    const frames: Frame[] = [{ state, events: [] }]
    for (const { cmd, action } of step.actions) {
      const result = lesson.simulator.execute(state, action)
      if (!result || !result.nextState) {
        frames.push({ state, events: [], cmd, feedback: '', status: 'success' })
        continue
      }
      state = result.nextState
      frames.push({ state, events: result.events, cmd, feedback: result.feedback, status: result.status })
    }
    return frames
  })

  cache.set(lesson, timeline)
  return timeline
}

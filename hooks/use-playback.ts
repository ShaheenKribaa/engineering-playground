'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson } from '@/lib/lessons/types'
import { buildTimeline } from '@/lib/sim/timeline'

const FIRST_DELAY = 450
const STEP_DELAY = 1000

export function usePlayback(lesson: Lesson, stepIndex: number) {
  const frames = useMemo(() => buildTimeline(lesson)[stepIndex], [lesson, stepIndex])
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(true)

  const done = cursor >= frames.length - 1

  useEffect(() => {
    if (!playing || done) return
    const timer = setTimeout(() => setCursor((c) => c + 1), cursor === 0 ? FIRST_DELAY : STEP_DELAY)
    return () => clearTimeout(timer)
  }, [playing, done, cursor])

  const replay = useCallback(() => {
    setCursor(0)
    setPlaying(true)
  }, [])

  const togglePlay = useCallback(() => {
    if (done) {
      replay()
      return
    }
    setPlaying((p) => !p)
  }, [done, replay])

  return {
    frames,
    cursor,
    frame: frames[cursor],
    playing: playing && !done,
    done,
    hasActions: frames.length > 1,
    replay,
    togglePlay,
  }
}

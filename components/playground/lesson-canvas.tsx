'use client'

import { Pause, Play, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { usePlayback } from '@/hooks/use-playback'
import type { Lesson } from '@/lib/lessons/types'
import type { Frame } from '@/lib/sim/timeline'
import { strongVar } from '@/lib/tones'
import { CommandConsole } from './command-console'
import { MetricChips } from './metric-chips'
import { DockerHost } from './viz/docker-host'
import { GitGraph } from './viz/git-graph'
import { KafkaCluster } from './viz/kafka-cluster'
import { K8sCluster } from './viz/k8s-cluster'
import { NetworkFlow } from './viz/network-flow'
import { CicdPipeline } from './viz/cicd-pipeline'

export function LessonCanvas({ lesson, stepIndex }: { lesson: Lesson; stepIndex: number }) {
  const playback = usePlayback(lesson, stepIndex)
  const [sandbox, setSandbox] = useState<Frame[]>([])
  const step = lesson.steps[stepIndex]
  const interactive = Boolean(step.sandbox && lesson.parse && playback.done)

  const frame = sandbox.at(-1) ?? playback.frame
  const lines = [...playback.frames.slice(1, playback.cursor + 1), ...sandbox]

  const run = (input: string) => {
    const parsed = lesson.parse?.(input)
    if (!parsed) return
    if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
      setSandbox((s) => [...s, { state: frame.state, events: [], cmd: input, feedback: String(parsed.error), status: 'failure' }])
      return
    }
    const result = lesson.simulator.execute(frame.state, parsed)
    setSandbox((s) => [
      ...s,
      { state: result.nextState, events: result.events, cmd: input, feedback: result.feedback, status: result.status },
    ])
  }

  const replay = () => {
    setSandbox([])
    playback.replay()
  }

  return (
    <section aria-label="Simulation" className="flex flex-1 flex-col rounded-xl border border-ink/30 bg-card/60">
      <div className="flex flex-wrap items-start justify-between gap-3 p-3">
        <MetricChips metrics={lesson.metrics(frame.state)} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={replay}
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold hard-shadow-sm hover:bg-accent"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Replay
          </button>
          {playback.hasActions && (
            <button
              type="button"
              onClick={playback.togglePlay}
              className="flex items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold hard-shadow-sm hover:bg-accent"
            >
              {playback.playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              {playback.playing ? 'Pause' : 'Play'}
            </button>
          )}
        </div>
      </div>

      <div className="canvas-dots relative mx-3 min-h-[320px] flex-1 overflow-hidden rounded-lg sm:min-h-[380px]">
        <div className="absolute inset-0 p-2">
          <Visualization lesson={lesson} frame={frame} />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Legend">
          {lesson.legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-ink/60" style={{ background: strongVar(item.tone) }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
        <CommandConsole
          lines={lines}
          interactive={interactive}
          hints={lesson.sandboxHints}
          onRun={run}
          pendingCount={playback.frames.length - 1}
        />
      </div>
    </section>
  )
}

function Visualization({ lesson, frame }: { lesson: Lesson; frame: Frame }) {
  const props = { state: frame.state as never, events: frame.events as never }
  switch (lesson.domainId) {
    case 'git':
      return <GitGraph {...props} />
    case 'docker':
      return <DockerHost {...props} />
    case 'kafka':
      return <KafkaCluster {...props} />
    case 'kubernetes':
      return <K8sCluster {...props} />
    case 'networking':
      return <NetworkFlow {...props} />
    case 'cicd':
      return <CicdPipeline {...props} />
    default:
      return null
  }
}

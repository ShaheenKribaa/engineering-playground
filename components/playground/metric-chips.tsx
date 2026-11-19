import {
  Box,
  Crosshair,
  Gauge,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  HardDrive,
  Layers,
  MessageSquare,
  Network,
  Rows3,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Metric, MetricIcon } from '@/lib/lessons/types'
import { cn } from '@/lib/utils'

const ICONS: Record<MetricIcon, LucideIcon> = {
  commit: GitCommitHorizontal,
  branch: GitBranch,
  head: Crosshair,
  activity: GitMerge,
  image: Layers,
  container: Box,
  network: Network,
  volume: HardDrive,
  partition: Rows3,
  message: MessageSquare,
  lag: Gauge,
  group: Users,
}

export function MetricChips({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="flex flex-wrap gap-2">
      {metrics.map((m) => {
        const Icon = ICONS[m.icon]
        return (
          <div
            key={m.label}
            className={cn(
              'min-w-24 rounded-md border border-ink/40 bg-card px-2.5 py-1.5',
              m.highlight && 'border-l-[3px] border-l-strong-green',
            )}
          >
            <dt className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              <Icon className="size-3" aria-hidden="true" />
              {m.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold">{m.value}</dd>
          </div>
        )
      })}
    </dl>
  )
}

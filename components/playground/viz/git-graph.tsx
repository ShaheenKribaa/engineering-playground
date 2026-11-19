'use client'

import { motion } from 'motion/react'
import { reachableCommits, type GitEvent, type GitMerge, type GitState } from '@/lib/sim/git'
import type { Tone } from '@/lib/lessons/types'
import { strongVar, tintVar } from '@/lib/tones'

const LANE_TONES: Tone[] = ['green', 'blue', 'orange', 'pink', 'lavender', 'yellow']
const COL = 104
const X0 = 90
const Y0 = 190
const LANE_GAP = 150
const spring = { type: 'spring', stiffness: 260, damping: 26 } as const

export function GitGraph({ state, events }: { state: GitState; events: GitEvent[] }) {
  if (!state.initialized) {
    return (
      <EmptyHint
        title="No repository yet"
        detail="Run git init to create one."
      />
    )
  }

  const commits = state.order.map((id) => state.commits[id])
  const lanes = Math.max(1, ...Object.values(state.branches).map((b) => b.lane + 1))
  const width = Math.max(960, X0 * 2 + Math.max(0, commits.length - 1) * COL)
  const height = Math.max(440, Y0 + (lanes - 1) * LANE_GAP + 120)
  const pos = (id: string) => {
    const c = state.commits[id]
    return { x: X0 + c.seq * COL, y: Y0 + c.lane * LANE_GAP }
  }
  const fresh = new Set(
    events.flatMap((e) => {
      if (e.type === 'COMMIT_CREATED' || e.type === 'MERGE_COMMIT') return [e.id]
      if (e.type === 'AMENDED') return [e.to]
      if (e.type === 'REBASED') return e.replayed.map((r) => r.to)
      return []
    }),
  )
  const reachable = reachableCommits(state)
  const replayArrows = events.flatMap((e) =>
    e.type === 'REBASED' ? e.replayed : e.type === 'AMENDED' ? [{ from: e.from, to: e.to }] : [],
  )

  const labelsByCommit = new Map<string, string[]>()
  for (const b of Object.values(state.branches)) {
    const key = b.head ?? '__unborn'
    labelsByCommit.set(key, [...(labelsByCommit.get(key) ?? []), b.name])
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Commit graph">
      <title>
        {`Commit graph with ${commits.length} commits. HEAD is on ${state.currentBranch}.`}
      </title>
      {Array.from({ length: lanes }, (_, lane) => (
        <line
          key={lane}
          x1={30}
          x2={width - 30}
          y1={Y0 + lane * LANE_GAP}
          y2={Y0 + lane * LANE_GAP}
          stroke="var(--ink)"
          strokeOpacity={0.12}
          strokeDasharray="4 6"
        />
      ))}

      {commits.flatMap((c) =>
        c.parents.map((p) => {
          const a = pos(p)
          const b = pos(c.id)
          const mid = (a.x + b.x) / 2
          const d = a.y === b.y ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`
          const dangling = !reachable.has(c.id)
          return (
            <motion.path
              key={`${p}-${c.id}`}
              d={d}
              fill="none"
              stroke="var(--ink)"
              strokeOpacity={dangling ? 0.25 : 1}
              strokeDasharray={dangling ? '4 4' : undefined}
              strokeWidth={2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          )
        }),
      )}

      {commits.map((c) => {
        const { x, y } = pos(c.id)
        const tone = LANE_TONES[c.lane % LANE_TONES.length]
        const isMerge = c.parents.length > 1
        const dangling = !reachable.has(c.id)
        return (
          <g key={c.id} transform={`translate(${x} ${y})`} opacity={dangling ? 0.35 : 1}>
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
            >
              {fresh.has(c.id) && (
                <motion.circle
                  r={20}
                  fill="none"
                  stroke={strongVar(tone)}
                  strokeWidth={2}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                />
              )}
              <circle cx={3} cy={3} r={isMerge ? 20 : 17} fill="var(--ink)" />
              <circle r={isMerge ? 20 : 17} fill={tintVar(tone)} stroke="var(--ink)" strokeWidth={2} />
              {isMerge && <circle r={12} fill="none" stroke="var(--ink)" strokeWidth={1.5} />}
            </motion.g>
            <text y={40} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">
              {c.id}
            </text>
            <text y={56} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
              {c.message.length > 15 ? `${c.message.slice(0, 14)}…` : c.message}
            </text>
          </g>
        )
      })}

      {replayArrows.map(({ from, to }) => {
        if (!state.commits[from] || !state.commits[to]) return null
        const a = pos(from)
        const b = pos(to)
        const lift = Math.min(a.y, b.y) + 70
        return (
          <motion.path
            key={`replay-${from}-${to}`}
            d={`M${a.x},${a.y + 22} C${a.x},${lift + 30} ${b.x},${lift + 30} ${b.x},${b.y + 22}`}
            fill="none"
            stroke="var(--strong-orange)"
            strokeWidth={1.75}
            strokeDasharray="5 4"
            markerEnd="url(#git-arrow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 0.7 }}
          />
        )
      })}

      {[...labelsByCommit.entries()].flatMap(([commitId, names]) => {
        const base = commitId === '__unborn' ? { x: X0, y: Y0 } : pos(commitId)
        return names.map((name, i) => (
          <BranchLabel
            key={name}
            name={name}
            isHead={state.currentBranch === name}
            x={base.x}
            y={base.y - 46 - i * 32}
          />
        ))
      })}

      {commits.length === 0 && (
        <circle cx={X0} cy={Y0} r={17} fill="none" stroke="var(--ink)" strokeOpacity={0.4} strokeDasharray="4 4" />
      )}

      <defs>
        <marker id="git-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--strong-orange)" />
        </marker>
      </defs>

      {state.merging && <ConflictPanel merging={state.merging} branch={state.currentBranch ?? 'HEAD'} x={width - 400} y={height - 30} />}
    </svg>
  )
}

function ConflictPanel({ merging, branch, x, y }: { merging: GitMerge; branch: string; x: number; y: number }) {
  const rowH = 96
  const h = 40 + merging.conflicts.length * rowH
  const top = y - h
  return (
    <motion.g initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <rect x={x + 4} y={top + 4} width={380} height={h} rx={12} fill="var(--ink)" />
      <rect x={x} y={top} width={380} height={h} rx={12} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.75} />
      <rect x={x} y={top} width={380} height={30} rx={12} fill="var(--tint-pink)" stroke="var(--ink)" strokeWidth={1.75} />
      <text x={x + 14} y={top + 20} fontSize={12} fontWeight={700} fill="var(--ink)">
        {`MERGING ${merging.branch} → ${branch}`}
      </text>
      <text x={x + 366} y={top + 20} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--ink)">
        {`${merging.conflicts.filter((c) => c.resolved !== undefined).length}/${merging.conflicts.length} resolved`}
      </text>
      {merging.conflicts.map((c, i) => {
        const ry = top + 40 + i * rowH
        const done = c.resolved !== undefined
        const lines = done
          ? [{ t: c.resolved!, tone: 'green' as const }]
          : [
              { t: '<<<<<<< HEAD', tone: null },
              { t: c.ours, tone: 'blue' as const },
              { t: '=======', tone: null },
              { t: c.theirs, tone: 'orange' as const },
              { t: `>>>>>>> ${merging.branch}`, tone: null },
            ]
        return (
          <g key={c.file}>
            <text x={x + 14} y={ry + 6} fontSize={11.5} fontWeight={700} fill={done ? 'var(--strong-green)' : 'var(--strong-pink)'}>
              {done ? `✓ ${c.file}` : `✕ ${c.file}`}
            </text>
            {lines.map((l, li) => (
              <g key={li}>
                {l.tone && <rect x={x + 12} y={ry + 12 + li * 15} width={356} height={14} rx={2} fill={tintVar(l.tone)} />}
                <text x={x + 18} y={ry + 23 + li * 15} fontSize={10.5} fill={l.tone ? 'var(--ink)' : 'var(--muted-foreground)'}>
                  {l.t.length > 52 ? `${l.t.slice(0, 51)}…` : l.t}
                </text>
              </g>
            ))}
          </g>
        )
      })}
    </motion.g>
  )
}

function BranchLabel({ name, isHead, x, y }: { name: string; isHead: boolean; x: number; y: number }) {
  const text = isHead ? `HEAD → ${name}` : name
  const w = text.length * 7.6 + 22
  return (
    <motion.g initial={{ x, y, opacity: 0 }} animate={{ x, y, opacity: 1 }} transition={spring}>
      <rect x={-w / 2 + 3} y={-13 + 3} width={w} height={26} rx={13} fill="var(--ink)" />
      <rect
        x={-w / 2}
        y={-13}
        width={w}
        height={26}
        rx={13}
        fill={isHead ? 'var(--tint-yellow)' : 'var(--tint-lavender)'}
        stroke="var(--ink)"
        strokeWidth={1.75}
      />
      <text y={4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ink)">
        {text}
      </text>
    </motion.g>
  )
}

export function EmptyHint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-ink/40" aria-hidden="true">
        <span className="size-3 rounded-full bg-ink/30" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

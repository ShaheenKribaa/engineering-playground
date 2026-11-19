'use client'

import { motion } from 'motion/react'
import type { KafkaEvent, KafkaState } from '@/lib/sim/kafka'
import type { Tone } from '@/lib/lessons/types'
import { strongVar, tintVar } from '@/lib/tones'

const W = 960
const H = 540
const TOPIC_X = 220
const TOPIC_W = 500
const ROW_Y0 = 170
const ROW_GAP = 104
const ROW_H = 58
const CELL_X0 = TOPIC_X + 92
const CELL_W = 40
const CELL_GAP = 4
const MAX_CELLS = 9
const GROUP_X = 760
const GROUP_TONES: Tone[] = ['green', 'lavender', 'blue', 'orange']
const PRODUCER = { x: 28, y: 250, w: 150, h: 78 }

const cellX = (i: number) => CELL_X0 + i * (CELL_W + CELL_GAP)
const rowY = (p: number) => ROW_Y0 + p * ROW_GAP

export function KafkaCluster({ state, events }: { state: KafkaState; events: KafkaEvent[] }) {
  const topic = state.topic
  const produced = new Set(events.flatMap((e) => (e.type === 'MESSAGE_PRODUCED' ? [`${e.partition}:${e.offset}`] : [])))
  const consumed = new Set(events.flatMap((e) => (e.type === 'CONSUMED' ? [`${e.partition}:${e.offset}`] : [])))

  let groupY = 120
  const groups = state.groups.map((g, gi) => {
    const block = { g, gi, y: groupY, h: 34 + g.members.length * 28 }
    groupY += block.h + 18
    return block
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Kafka cluster">
      <title>{`Kafka cluster with ${state.brokers.length} brokers${topic ? `, topic ${topic.name} with ${topic.partitions.length} partitions` : ''}.`}</title>

      {state.brokers.map((b, i) => {
        const x = TOPIC_X + 30 + i * 160
        const leads = topic?.partitions.filter((p) => p.leader === b).map((p) => `P${p.id}`) ?? []
        return (
          <g key={b} transform={`translate(${x} 34)`}>
            <rect x={3} y={3} width={140} height={52} rx={10} fill="var(--ink)" />
            <rect width={140} height={52} rx={10} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1.75} />
            <rect x={12} y={14} width={22} height={9} rx={2} fill="var(--card)" stroke="var(--ink)" />
            <rect x={12} y={27} width={22} height={9} rx={2} fill="var(--card)" stroke="var(--ink)" />
            <text x={44} y={24} fontSize={13} fontWeight={700} fill="var(--ink)">
              broker-{b}
            </text>
            <text x={44} y={40} fontSize={10} fill="var(--muted-foreground)">
              {leads.length ? `leader ${leads.join(', ')}` : 'no partitions'}
            </text>
          </g>
        )
      })}

      <g transform={`translate(${PRODUCER.x} ${PRODUCER.y})`}>
        <rect x={3} y={3} width={PRODUCER.w} height={PRODUCER.h} rx={12} fill="var(--ink)" />
        <rect width={PRODUCER.w} height={PRODUCER.h} rx={12} fill="var(--tint-yellow)" stroke="var(--ink)" strokeWidth={1.75} />
        <text x={PRODUCER.w / 2} y={34} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
          producer
        </text>
        <text x={PRODUCER.w / 2} y={54} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
          checkout-svc
        </text>
      </g>

      {!topic ? (
        <g>
          <rect x={TOPIC_X} y={130} width={TOPIC_W} height={340} rx={16} fill="none" stroke="var(--ink)" strokeOpacity={0.35} strokeDasharray="6 6" />
          <text x={TOPIC_X + TOPIC_W / 2} y={300} textAnchor="middle" fontSize={14} fill="var(--muted-foreground)">
            No topics yet
          </text>
        </g>
      ) : (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <rect x={TOPIC_X} y={118} width={TOPIC_W} height={rowY(topic.partitions.length - 1) + ROW_H + 40 - 118} rx={16} fill="var(--card)" fillOpacity={0.7} stroke="var(--ink)" strokeWidth={1.5} />
          <text x={TOPIC_X + 18} y={144} fontSize={12} fontWeight={700} letterSpacing={1} fill="var(--ink)">
            TOPIC · {topic.name}
          </text>

          {topic.partitions.map((p) => {
            const y = rowY(p.id)
            const start = Math.max(0, p.log.length - MAX_CELLS)
            const visible = p.log.slice(start)
            return (
              <g key={p.id}>
                <path
                  d={`M${PRODUCER.x + PRODUCER.w},${PRODUCER.y + PRODUCER.h / 2} C${TOPIC_X - 10},${PRODUCER.y + PRODUCER.h / 2} ${TOPIC_X - 30},${y + ROW_H / 2} ${TOPIC_X + 12},${y + ROW_H / 2}`}
                  fill="none"
                  stroke="var(--ink)"
                  strokeOpacity={0.2}
                  strokeWidth={1.5}
                />
                <rect x={TOPIC_X + 14} y={y} width={68} height={ROW_H} rx={8} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1.5} />
                <text x={TOPIC_X + 48} y={y + 26} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--ink)">
                  P{p.id}
                </text>
                <text x={TOPIC_X + 48} y={y + 43} textAnchor="middle" fontSize={9.5} fill="var(--muted-foreground)">
                  on b{p.leader}
                </text>
                <rect x={CELL_X0 - 4} y={y} width={MAX_CELLS * (CELL_W + CELL_GAP) + 4} height={ROW_H} rx={8} fill="none" stroke="var(--ink)" strokeOpacity={0.25} strokeDasharray="3 4" />

                {visible.map((m, vi) => {
                  const key = `${p.id}:${m.offset}`
                  const isNew = produced.has(key)
                  const x = cellX(vi)
                  return (
                    <motion.g
                      key={key}
                      initial={isNew ? { opacity: 0, x: PRODUCER.x + PRODUCER.w - x, y: PRODUCER.y - y } : false}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                    >
                      <rect
                        x={x}
                        y={y + 6}
                        width={CELL_W}
                        height={ROW_H - 12}
                        rx={6}
                        fill={consumed.has(key) ? 'var(--tint-green)' : 'var(--tint-yellow)'}
                        stroke="var(--ink)"
                        strokeWidth={1.5}
                      />
                      <text x={x + CELL_W / 2} y={y + 24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">
                        {m.offset}
                      </text>
                      <text x={x + CELL_W / 2} y={y + 40} textAnchor="middle" fontSize={8.5} fill="var(--muted-foreground)">
                        {m.key.replace('user-', 'u')}
                      </text>
                    </motion.g>
                  )
                })}

                {state.groups.map((g, gi) => {
                  const committed = g.committed[p.id] ?? 0
                  const idx = Math.max(0, committed - start)
                  const mx = cellX(idx) - CELL_GAP / 2
                  const tone = GROUP_TONES[gi % GROUP_TONES.length]
                  const my = y + ROW_H + 4 + gi * 13
                  return (
                    <motion.g key={g.id} initial={false} animate={{ x: mx, y: my }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
                      <path d="M0,0 L6,9 L-6,9 Z" fill={strongVar(tone)} stroke="var(--ink)" strokeWidth={1} />
                      <text x={9} y={9} fontSize={9} fontWeight={700} fill={strongVar(tone)}>
                        {g.id}@{committed}
                      </text>
                    </motion.g>
                  )
                })}
              </g>
            )
          })}
        </motion.g>
      )}

      {topic &&
        groups.flatMap(({ g, gi, y }) =>
          g.members.flatMap((m, mi) =>
            g.assignment[m].map((p) => {
              const tone = GROUP_TONES[gi % GROUP_TONES.length]
              const sy = y + 34 + mi * 28 + 11
              const ty = rowY(p) + ROW_H / 2
              const sx = TOPIC_X + TOPIC_W
              return (
                <motion.path
                  key={`${g.id}-${m}-${p}`}
                  d={`M${sx},${ty} C${sx + 24},${ty} ${GROUP_X - 24},${sy} ${GROUP_X},${sy}`}
                  fill="none"
                  stroke={strongVar(tone)}
                  strokeWidth={2}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              )
            }),
          ),
        )}

      {groups.map(({ g, gi, y, h }) => {
        const tone = GROUP_TONES[gi % GROUP_TONES.length]
        return (
          <motion.g key={g.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <rect x={GROUP_X + 3} y={y + 3} width={176} height={h} rx={10} fill="var(--ink)" />
            <rect x={GROUP_X} y={y} width={176} height={h} rx={10} fill={tintVar(tone)} stroke="var(--ink)" strokeWidth={1.75} />
            <text x={GROUP_X + 12} y={y + 22} fontSize={12} fontWeight={700} fill="var(--ink)">
              group: {g.id}
            </text>
            {g.members.map((m, mi) => {
              const parts = g.assignment[m]
              const idle = parts.length === 0
              return (
                <motion.g key={m} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <rect
                    x={GROUP_X + 8}
                    y={y + 34 + mi * 28}
                    width={160}
                    height={22}
                    rx={5}
                    fill="var(--card)"
                    stroke="var(--ink)"
                    strokeOpacity={idle ? 0.35 : 0.8}
                    strokeDasharray={idle ? '4 3' : undefined}
                  />
                  <text x={GROUP_X + 16} y={y + 49 + mi * 28} fontSize={11} fontWeight={700} fill="var(--ink)">
                    {m}
                  </text>
                  <text
                    x={GROUP_X + 160}
                    y={y + 49 + mi * 28}
                    textAnchor="end"
                    fontSize={10}
                    fill={idle ? 'var(--strong-pink)' : 'var(--muted-foreground)'}
                  >
                    {idle ? 'idle' : parts.map((p) => `P${p}`).join(' ')}
                  </text>
                </motion.g>
              )
            })}
          </motion.g>
        )
      })}

      {groups.length === 0 && (
        <text x={GROUP_X + 88} y={300} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
          no consumers
        </text>
      )}
    </svg>
  )
}

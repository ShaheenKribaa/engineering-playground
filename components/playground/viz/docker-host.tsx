'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { DockerContainer, DockerEvent, DockerState } from '@/lib/sim/docker'

const W = 960
const H = 540
const IMG_X = 36
const IMG_W = 210
const CT_X0 = 300
const CT_COL = 200
const CT_W = 176
const CT_H = 96
const VOL_X = 760
const BUS_Y = 486
const spring = { type: 'spring', stiffness: 240, damping: 26 } as const

export function DockerHost({ state, events }: { state: DockerState; events: DockerEvent[] }) {
  let imgY = 72
  const images = state.images.map((img) => {
    const h = 34 + img.layers.length * 22
    const block = { img, y: imgY, h }
    imgY += h + 18
    return block
  })
  const imageMid = (ref: string) => {
    const b = images.find((i) => i.img.ref === ref)
    return b ? b.y + b.h / 2 : 0
  }

  const containers = [...state.containers].sort((a, b) => a.seq - b.seq)
  const ctPos = (i: number) => ({ x: CT_X0 + (i % 2) * CT_COL, y: 72 + Math.floor(i / 2) * 124 })
  const userNetworks = state.networks.filter((n) => n !== 'bridge')
  const volY = (i: number) => 84 + i * 150
  const freshVolumes = new Set(events.flatMap((e) => (e.type === 'VOLUME_WRITTEN' ? [e.name] : [])))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Docker host">
      <title>{`Docker host with ${state.images.length} images, ${containers.length} containers and ${state.volumes.length} volumes.`}</title>
      <rect x={12} y={12} width={W - 24} height={H - 24} rx={18} fill="var(--card)" fillOpacity={0.55} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.5} />
      <SectionLabel x={IMG_X} text="IMAGES" />
      <SectionLabel x={CT_X0} text="CONTAINERS" />
      <SectionLabel x={VOL_X} text="VOLUMES" />
      <line x1={272} x2={272} y1={36} y2={H - 36} stroke="var(--ink)" strokeOpacity={0.12} strokeDasharray="4 6" />
      <line x1={732} x2={732} y1={36} y2={H - 36} stroke="var(--ink)" strokeOpacity={0.12} strokeDasharray="4 6" />

      {containers.map((c, i) => {
        const p = ctPos(i)
        const y1 = imageMid(c.image)
        if (!y1) return null
        return (
          <motion.path
            key={`img-${c.name}`}
            fill="none"
            stroke="var(--strong-yellow)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ d: `M${IMG_X + IMG_W},${y1} C${IMG_X + IMG_W + 40},${y1} ${p.x - 40},${p.y + CT_H / 2} ${p.x},${p.y + CT_H / 2}`, pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 0.5 }}
          />
        )
      })}

      {userNetworks.map((net, ni) => {
        const y = BUS_Y - ni * 22
        const members = containers.map((c, i) => ({ c, i })).filter(({ c }) => c.networks.includes(net))
        return (
          <g key={net}>
            <motion.line
              x1={CT_X0 - 10}
              x2={CT_X0 + CT_COL + CT_W + 10}
              y1={y}
              y2={y}
              stroke="var(--strong-blue)"
              strokeWidth={3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            <g transform={`translate(${CT_X0 + CT_COL + CT_W - 70} ${y - 12})`}>
              <rect width={80} height={22} rx={11} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1.5} />
              <text x={40} y={15} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)">
                {net}
              </text>
            </g>
            {members.map(({ c, i }) => {
              const p = ctPos(i)
              const x = p.x + 24 + ni * 12
              return (
                <motion.line
                  key={c.name}
                  x1={x}
                  x2={x}
                  y1={p.y + CT_H}
                  y2={y}
                  stroke="var(--strong-blue)"
                  strokeWidth={2}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
              )
            })}
          </g>
        )
      })}

      {containers.flatMap((c, i) =>
        c.mounts.map((m) => {
          const vi = state.volumes.findIndex((v) => v.name === m.volume)
          if (vi < 0) return null
          const p = ctPos(i)
          const sx = p.x + CT_W
          const sy = p.y + CT_H / 2
          const ty = volY(vi) + 40
          return (
            <motion.path
              key={`mnt-${c.id}`}
              d={`M${sx},${sy} C${sx + 50},${sy} ${VOL_X - 40},${ty} ${VOL_X},${ty}`}
              fill="none"
              stroke="var(--strong-orange)"
              strokeWidth={2.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          )
        }),
      )}

      <AnimatePresence>
        {images.map(({ img, y }) => (
          <motion.g key={img.ref} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
            <g transform={`translate(${IMG_X} ${y})`}>
              <rect x={3} y={3} width={IMG_W} height={24} rx={6} fill="var(--ink)" />
              <rect width={IMG_W} height={24} rx={6} fill="var(--tint-yellow)" stroke="var(--ink)" strokeWidth={1.5} />
              <text x={10} y={16} fontSize={12} fontWeight={700} fill="var(--ink)">
                {img.ref}
              </text>
              <text x={IMG_W - 10} y={16} fontSize={9} textAnchor="end" fill="var(--muted-foreground)">
                {img.source}
              </text>
              {[...img.layers].reverse().map((layer, li) => (
                <motion.g
                  key={layer.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: li * 0.06 }}
                >
                  <rect
                    x={8}
                    y={30 + li * 22}
                    width={IMG_W - 16}
                    height={18}
                    rx={3}
                    fill={layer.cached ? 'var(--tint-green)' : 'var(--card)'}
                    stroke="var(--ink)"
                    strokeOpacity={0.6}
                  />
                  <text x={14} y={42.5 + li * 22} fontSize={9.5} fill="var(--ink)">
                    {layer.label.length > 26 ? `${layer.label.slice(0, 25)}…` : layer.label}
                  </text>
                  {layer.cached && (
                    <text x={IMG_W - 14} y={42.5 + li * 22} fontSize={8.5} textAnchor="end" fontWeight={700} fill="var(--strong-green)">
                      shared
                    </text>
                  )}
                </motion.g>
              ))}
            </g>
          </motion.g>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {containers.map((c, i) => (
          <ContainerCard key={c.id} container={c} {...ctPos(i)} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {state.volumes.map((v, vi) => (
          <motion.g
            key={v.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            transition={spring}
          >
            <Cylinder x={VOL_X} y={volY(vi)} name={v.name} data={v.data} pulse={freshVolumes.has(v.name)} />
          </motion.g>
        ))}
      </AnimatePresence>

      {state.images.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={14} fill="var(--muted-foreground)">
          Empty host — no images, containers or volumes yet
        </text>
      )}
    </svg>
  )
}

function SectionLabel({ x, text }: { x: number; text: string }) {
  return (
    <text x={x} y={48} fontSize={11} fontWeight={700} letterSpacing={1.5} fill="var(--muted-foreground)">
      {text}
    </text>
  )
}

function ContainerCard({ container: c, x, y }: { container: DockerContainer; x: number; y: number }) {
  const running = c.status === 'running'
  return (
    <motion.g
      initial={{ opacity: 0, x, y: y + 16 }}
      animate={{ opacity: 1, x, y }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
      transition={spring}
    >
      <rect x={4} y={4} width={CT_W} height={CT_H} rx={10} fill="var(--ink)" opacity={running ? 1 : 0.25} />
      <rect
        width={CT_W}
        height={CT_H}
        rx={10}
        fill={running ? 'var(--tint-green)' : 'var(--muted)'}
        stroke="var(--ink)"
        strokeWidth={1.75}
        strokeDasharray={running ? undefined : '5 4'}
      />
      <rect x={10} y={10} width={CT_W - 20} height={10} rx={3} fill="var(--card)" stroke="var(--ink)" strokeOpacity={0.5} />
      <text x={CT_W / 2} y={18} textAnchor="middle" fontSize={7.5} fill="var(--muted-foreground)">
        writable layer
      </text>
      <circle cx={20} cy={40} r={5} fill={running ? 'var(--strong-green)' : 'var(--muted-foreground)'} />
      <text x={32} y={44.5} fontSize={14} fontWeight={700} fill="var(--ink)">
        {c.name}
      </text>
      <text x={14} y={64} fontSize={10.5} fill="var(--muted-foreground)">
        {c.image} · {c.status}
      </text>
      {c.ports.map((port) => (
        <g key={port} transform={`translate(${CT_W - 84} 72)`}>
          <rect width={74} height={17} rx={8.5} fill="var(--card)" stroke="var(--ink)" strokeWidth={1} />
          <text x={37} y={12} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ink)">
            :{port.replace(':', ' → ')}
          </text>
        </g>
      ))}
    </motion.g>
  )
}

function Cylinder({ x, y, name, data, pulse }: { x: number; y: number; name: string; data: string[]; pulse: boolean }) {
  const w = 164
  const h = 92
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0,12 L0,${h} A${w / 2},12 0 0 0 ${w},${h} L${w},12`}
        fill="var(--tint-orange)"
        stroke="var(--ink)"
        strokeWidth={1.75}
      />
      <ellipse cx={w / 2} cy={12} rx={w / 2} ry={12} fill="var(--tint-orange)" stroke="var(--ink)" strokeWidth={1.75} />
      {pulse && (
        <motion.ellipse
          cx={w / 2}
          cy={12}
          rx={w / 2}
          ry={12}
          fill="none"
          stroke="var(--strong-orange)"
          strokeWidth={2}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, repeat: 1 }}
        />
      )}
      <text x={w / 2} y={44} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">
        {name}
      </text>
      <text x={w / 2} y={64} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
        {data.length ? data.join(', ') : 'empty'}
      </text>
    </g>
  )
}

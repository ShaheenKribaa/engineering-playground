'use client'

import { motion } from 'motion/react'
import type { NetworkEvent, NetworkState } from '@/lib/sim/networking'

const W = 960
const H = 540

export function NetworkFlow({ state, events }: { state: NetworkState; events: NetworkEvent[] }) {
  const nodes = [
    { id: 'client', name: 'Client Browser', sub: state.clientIp, x: 80, y: 70, tone: 'var(--tint-green)' },
    { id: 'resolver', name: 'Recursive Resolver', sub: '8.8.8.8', x: 300, y: 70, tone: 'var(--tint-blue)' },
    { id: 'root', name: 'Root Server', sub: '198.41.0.4 (.)', x: 520, y: 70, tone: 'var(--tint-lavender)' },
    { id: 'tld', name: 'TLD Server', sub: '192.5.6.30 (.com)', x: 740, y: 70, tone: 'var(--tint-lavender)' },
    { id: 'server', name: 'Origin Web Server', sub: state.serverIp, x: 520, y: 190, tone: 'var(--tint-yellow)' },
  ]

  const recentPackets = state.packets.slice(-6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Networking Flow">
      <title>Networking, DNS resolution, and TCP/TLS packet flow visualizer</title>

      {/* Network Nodes */}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x - 70} ${n.y})`}>
          <rect x={3} y={3} width={140} height={64} rx={8} fill="var(--ink)" />
          <rect width={140} height={64} rx={8} fill={n.tone} stroke="var(--ink)" strokeWidth={1.75} />
          <text x={70} y={26} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--ink)">
            {n.name}
          </text>
          <text x={70} y={46} textAnchor="middle" fontSize={9.5} fill="var(--muted-foreground)">
            {n.sub}
          </text>
        </g>
      ))}

      {/* Connection status pills */}
      <g transform="translate(80 180)">
        <rect x={2} y={2} width={180} height={40} rx={6} fill="var(--ink)" />
        <rect width={180} height={40} rx={6} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
        <circle
          cx={16}
          cy={20}
          r={5}
          fill={state.tcpState === 'ESTABLISHED' ? 'var(--strong-green)' : 'var(--muted-foreground)'}
        />
        <text x={28} y={24} fontSize={11} fontWeight={600} fill="var(--ink)">
          TCP: {state.tcpState}
        </text>
      </g>

      <g transform="translate(280 180)">
        <rect x={2} y={2} width={190} height={40} rx={6} fill="var(--ink)" />
        <rect width={190} height={40} rx={6} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
        <circle
          cx={16}
          cy={20}
          r={5}
          fill={state.tlsState === 'ENCRYPTED' ? 'var(--strong-green)' : 'var(--muted-foreground)'}
        />
        <text x={28} y={24} fontSize={11} fontWeight={600} fill="var(--ink)">
          TLS 1.3: {state.tlsState}
        </text>
      </g>

      {/* Packets Stream Log */}
      <g transform="translate(80 250)">
        <rect x={3} y={3} width={800} height={250} rx={10} fill="var(--ink)" />
        <rect width={800} height={250} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.75} />

        {/* Console Header */}
        <rect width={800} height={32} rx={10} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1.75} />
        <rect y={22} width={800} height={10} fill="var(--tint-blue)" />
        <line x1={0} y1={32} x2={800} y2={32} stroke="var(--ink)" strokeWidth={1.5} />
        <text x={16} y={21} fontSize={11} fontWeight={700} fill="var(--ink)">
          WIRESHARK / PCAP TRACE • {state.packets.length} Packet(s) Captured
        </text>

        {/* Packet rows */}
        {recentPackets.map((pkt, i) => {
          const protoColor =
            pkt.protocol === 'DNS'
              ? 'var(--tint-blue)'
              : pkt.protocol === 'TCP'
              ? 'var(--tint-yellow)'
              : pkt.protocol === 'TLS'
              ? 'var(--tint-lavender)'
              : 'var(--tint-green)'

          return (
            <g key={pkt.id} transform={`translate(16 ${44 + i * 32})`}>
              <rect width={48} height={20} rx={4} fill={protoColor} stroke="var(--ink)" strokeWidth={1} />
              <text x={24} y={14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ink)">
                {pkt.protocol}
              </text>
              <text x={64} y={14} fontSize={11} fontWeight={600} fill="var(--ink)">
                {pkt.from} → {pkt.to}
              </text>
              <text x={420} y={14} fontSize={10} fill="var(--muted-foreground)">
                {pkt.summary}
              </text>
            </g>
          )
        })}

        {recentPackets.length === 0 && (
          <text x={400} y={140} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
            No network packets transmitted yet. Run a step to observe the protocol stream.
          </text>
        )}
      </g>
    </svg>
  )
}

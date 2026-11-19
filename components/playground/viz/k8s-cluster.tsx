'use client'

import { motion } from 'motion/react'
import type { K8sEvent, K8sState } from '@/lib/sim/k8s'

const W = 960
const H = 540

export function K8sCluster({ state, events }: { state: K8sState; events: K8sEvent[] }) {
  const nodeCount = state.nodes.length
  const nodeWidth = 270
  const nodeGap = 28
  const startX = (W - (nodeCount * nodeWidth + (nodeCount - 1) * nodeGap)) / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Kubernetes Cluster">
      <title>{`Kubernetes cluster with ${state.nodes.length} nodes and ${state.pods.length} pods.`}</title>

      {/* Control Plane Banner */}
      <g transform="translate(180 18)">
        <rect x={3} y={3} width={600} height={46} rx={8} fill="var(--ink)" />
        <rect width={600} height={46} rx={8} fill="var(--tint-lavender)" stroke="var(--ink)" strokeWidth={1.75} />
        <text x={300} y={24} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">
          Kube-API-Server & Controller-Manager
        </text>
        <text x={300} y={39} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
          {state.deployments.length ? `Managing ${state.deployments.length} deployment(s)` : 'Cluster initialized'}
          {state.services.length ? ` • ${state.services.length} active service(s)` : ''}
        </text>
      </g>

      {/* Services / Ingress bar */}
      {state.services.map((svc, i) => {
        const sx = 260 + i * 220
        return (
          <g key={svc.name} transform={`translate(${sx} 76)`}>
            <rect x={2} y={2} width={200} height={42} rx={6} fill="var(--ink)" />
            <rect width={200} height={42} rx={6} fill="var(--tint-yellow)" stroke="var(--ink)" strokeWidth={1.5} />
            <text x={14} y={20} fontSize={12} fontWeight={700} fill="var(--ink)">
              svc/{svc.name}
            </text>
            <text x={14} y={34} fontSize={10} fill="var(--muted-foreground)">
              {svc.type}:{svc.port} → :{svc.targetPort}
            </text>
          </g>
        )
      })}

      {/* Worker Nodes */}
      {state.nodes.map((node, ni) => {
        const nx = startX + ni * (nodeWidth + nodeGap)
        const ny = 140
        const nodePods = state.pods.filter((p) => p.node === node.name)

        return (
          <g key={node.name} transform={`translate(${nx} ${ny})`}>
            {/* Hard drop shadow */}
            <rect x={3} y={3} width={nodeWidth} height={360} rx={12} fill="var(--ink)" />
            <rect
              width={nodeWidth}
              height={360}
              rx={12}
              fill="var(--card)"
              stroke="var(--ink)"
              strokeWidth={1.75}
            />

            {/* Node header */}
            <rect width={nodeWidth} height={40} rx={12} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1.75} />
            <rect y={28} width={nodeWidth} height={12} fill="var(--tint-blue)" />
            <line x1={0} y1={40} x2={nodeWidth} y2={40} stroke="var(--ink)" strokeWidth={1.5} />

            <circle cx={18} cy={20} r={4.5} fill="var(--strong-green)" stroke="var(--ink)" strokeWidth={1} />
            <text x={30} y={24} fontSize={13} fontWeight={700} fill="var(--ink)">
              {node.name}
            </text>
            <text x={nodeWidth - 14} y={24} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
              {node.cpu} CPUs • {node.memory}
            </text>

            {/* Kubelet label */}
            <text x={14} y={62} fontSize={10} fontWeight={600} fill="var(--muted-foreground)">
              Kubelet / Containerd ({nodePods.length} pods)
            </text>

            {/* Pods list */}
            {nodePods.map((pod, pi) => {
              const py = 76 + pi * 66
              const isTarget = state.trafficTarget === pod.name

              return (
                <motion.g
                  key={pod.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  transform={`translate(14 ${py})`}
                >
                  <rect x={2} y={2} width={nodeWidth - 28} height={56} rx={8} fill="var(--ink)" />
                  <rect
                    width={nodeWidth - 28}
                    height={56}
                    rx={8}
                    fill={isTarget ? 'var(--tint-yellow)' : 'var(--tint-green)'}
                    stroke="var(--ink)"
                    strokeWidth={isTarget ? 2.5 : 1.5}
                  />
                  <circle cx={14} cy={20} r={4} fill="var(--strong-green)" />
                  <text x={26} y={22} fontSize={11.5} fontWeight={700} fill="var(--ink)">
                    {pod.name}
                  </text>
                  <text x={26} y={42} fontSize={9.5} fill="var(--muted-foreground)">
                    IP: {pod.ip} • {pod.deployment}
                  </text>
                </motion.g>
              )
            })}

            {nodePods.length === 0 && (
              <text x={nodeWidth / 2} y={180} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                (Ready for pods)
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

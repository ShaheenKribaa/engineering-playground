'use client'

import { motion } from 'motion/react'
import type { CicdEvent, CicdState, JobStatus } from '@/lib/sim/cicd'

const W = 960
const H = 540

export function CicdPipeline({ state, events }: { state: CicdState; events: CicdEvent[] }) {
  const stageWidth = 200
  const stageGap = 20
  const startX = 30

  const getStatusFill = (status: JobStatus) => {
    switch (status) {
      case 'success':
        return 'var(--tint-green)'
      case 'running':
        return 'var(--tint-yellow)'
      case 'failed':
        return 'var(--tint-pink)'
      default:
        return 'var(--card)'
    }
  }

  const getBadgeColor = (status: JobStatus) => {
    switch (status) {
      case 'success':
        return 'var(--strong-green)'
      case 'running':
        return 'var(--strong-yellow)'
      case 'failed':
        return 'var(--strong-pink)'
      default:
        return 'var(--muted-foreground)'
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="CI/CD Pipeline Graph">
      <title>{`CI/CD Pipeline ${state.pipelineId} on branch ${state.branch}`}</title>

      {/* Top Pipeline Header */}
      <g transform="translate(30 20)">
        <rect x={3} y={3} width={900} height={50} rx={8} fill="var(--ink)" />
        <rect width={900} height={50} rx={8} fill="var(--tint-lavender)" stroke="var(--ink)" strokeWidth={1.75} />
        <text x={20} y={30} fontSize={13} fontWeight={700} fill="var(--ink)">
          Pipeline {state.pipelineId} • commit {state.commit} ({state.branch})
        </text>
        <text x={640} y={30} fontSize={12} fill="var(--muted-foreground)">
          Status: <tspan fontWeight={700} fill="var(--ink)">{state.status.toUpperCase()}</tspan> • Env: <tspan fontWeight={700} fill="var(--strong-green)">{state.activeEnvironment}</tspan>
        </text>
      </g>

      {/* Pipeline Stages */}
      {state.stages.map((stage, si) => {
        const sx = startX + si * (stageWidth + stageGap)
        const sy = 100

        return (
          <g key={stage.id} transform={`translate(${sx} ${sy})`}>
            {/* Hard shadow */}
            <rect x={3} y={3} width={stageWidth} height={260} rx={10} fill="var(--ink)" />
            <rect
              width={stageWidth}
              height={260}
              rx={10}
              fill={getStatusFill(stage.status)}
              stroke="var(--ink)"
              strokeWidth={1.75}
            />

            {/* Stage Title */}
            <rect width={stageWidth} height={36} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
            <rect y={24} width={stageWidth} height={12} fill="var(--card)" />
            <line x1={0} y1={36} x2={stageWidth} y2={36} stroke="var(--ink)" strokeWidth={1.5} />
            <circle cx={16} cy={18} r={4.5} fill={getBadgeColor(stage.status)} />
            <text x={28} y={22} fontSize={11.5} fontWeight={700} fill="var(--ink)">
              {stage.name}
            </text>

            {/* Stage Jobs */}
            {stage.jobs.map((job, ji) => {
              const jy = 50 + ji * 68
              return (
                <motion.g
                  key={job.id}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transform={`translate(12 ${jy})`}
                >
                  <rect x={2} y={2} width={stageWidth - 24} height={56} rx={6} fill="var(--ink)" />
                  <rect
                    width={stageWidth - 24}
                    height={56}
                    rx={6}
                    fill="var(--card)"
                    stroke="var(--ink)"
                    strokeWidth={1.5}
                  />
                  <text x={12} y={20} fontSize={11} fontWeight={700} fill="var(--ink)">
                    {job.name}
                  </text>
                  <text x={12} y={36} fontSize={9.5} fill="var(--muted-foreground)">
                    {job.command}
                  </text>
                  <text x={stageWidth - 36} y={48} textAnchor="end" fontSize={9} fontWeight={600} fill="var(--muted-foreground)">
                    {job.status === 'success' ? '✓ ' + job.duration : job.status}
                  </text>
                </motion.g>
              )
            })}
          </g>
        )
      })}

      {/* Artifacts Drawer */}
      <g transform="translate(30 380)">
        <rect x={3} y={3} width={900} height={130} rx={10} fill="var(--ink)" />
        <rect width={900} height={130} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.75} />
        
        {/* Header */}
        <text x={20} y={26} fontSize={12} fontWeight={700} fill="var(--ink)">
          BUILD ARTIFACTS & DEPLOYMENT TARGETS
        </text>

        {state.artifacts.map((art, i) => (
          <g key={art.name} transform={`translate(20 ${40 + i * 36})`}>
            <rect width={420} height={30} rx={6} fill="var(--tint-green)" stroke="var(--ink)" strokeWidth={1} />
            <text x={12} y={19} fontSize={11} fontWeight={700} fill="var(--ink)">
              📦 {art.name}
            </text>
            <text x={400} y={19} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
              {art.size} • {art.hash}
            </text>
          </g>
        ))}

        {state.artifacts.length === 0 && (
          <text x={20} y={64} fontSize={11} fill="var(--muted-foreground)">
            (No artifacts built yet — runs after the build & package stage)
          </text>
        )}

        <g transform="translate(480 40)">
          <rect width={400} height={66} rx={6} fill="var(--tint-blue)" stroke="var(--ink)" strokeWidth={1} />
          <text x={16} y={24} fontSize={11} fontWeight={700} fill="var(--ink)">
            Active Environment Target
          </text>
          <text x={16} y={48} fontSize={12} fontWeight={800} fill="var(--ink)">
            {state.activeEnvironment === 'none' ? 'Waiting for promotion...' : `Live on: ${state.activeEnvironment.toUpperCase()}`}
          </text>
        </g>
      </g>
    </svg>
  )
}

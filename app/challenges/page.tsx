'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/playground/app-header'
import { ShellProvider } from '@/components/playground/shell-context'
import { CommandConsole } from '@/components/playground/command-console'
import { GitGraph } from '@/components/playground/viz/git-graph'
import { DockerHost } from '@/components/playground/viz/docker-host'
import { KafkaCluster } from '@/components/playground/viz/kafka-cluster'
import { K8sCluster } from '@/components/playground/viz/k8s-cluster'
import { gitSimulator, parseGitCommand, reachableCommits, type GitState, type GitAction } from '@/lib/sim/git'
import { dockerSimulator, type DockerState, type DockerAction } from '@/lib/sim/docker'
import { kafkaSimulator, type KafkaState, type KafkaAction, groupLag } from '@/lib/sim/kafka'
import { k8sSimulator, type K8sState, type K8sAction } from '@/lib/sim/k8s'
import type { Frame } from '@/lib/sim/timeline'
import { CheckCircle2, Circle, RotateCcw, Trophy, ArrowRight, ShieldCheck, Sparkles, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChallengeTask {
  id: string
  title: string
  domain: 'git' | 'docker' | 'kafka' | 'kubernetes'
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  objective: string
  hints: string[]
  init: () => any
  parse?: (cmd: string) => any
  execute: (state: any, action: any) => any
  requirements: {
    label: string
    check: (state: any) => boolean
  }[]
}

const CHALLENGES: ChallengeTask[] = [
  {
    id: 'git-rebase-flow',
    title: 'The Linear Rebase',
    domain: 'git',
    level: 'Beginner',
    objective: 'Rebase the diverged "feature" branch onto "main", then switch to "main" and fast-forward merge so history is linear.',
    hints: ['git switch feature', 'git rebase main', 'git switch main', 'git merge feature'],
    init: () => {
      let s = gitSimulator.initialize()
      s = gitSimulator.execute(s, { type: 'init' }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Initial shop' }).nextState
      s = gitSimulator.execute(s, { type: 'switch', name: 'feature', create: true }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Add search bar' }).nextState
      s = gitSimulator.execute(s, { type: 'switch', name: 'main' }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Add checkout header' }).nextState
      return s
    },
    parse: parseGitCommand,
    execute: (s: GitState, a: GitAction) => gitSimulator.execute(s, a),
    requirements: [
      {
        label: 'HEAD is on main',
        check: (s: GitState) => s.currentBranch === 'main',
      },
      {
        label: 'main and feature point to the same commit (fast-forwarded)',
        check: (s: GitState) => Boolean(s.branches.main?.head && s.branches.main?.head === s.branches.feature?.head),
      },
      {
        label: 'No two-parent merge commits created (linear history)',
        check: (s: GitState) => {
          const reachable = reachableCommits(s)
          return !s.order.some((id) => reachable.has(id) && s.commits[id].parents.length > 1)
        },
      },
    ],
  },
  {
    id: 'git-cherry-pick-fix',
    title: 'Surgical Hotfix Cherry-Pick',
    domain: 'git',
    level: 'Intermediate',
    objective: 'Copy only the "Critical security patch" commit from the "hotfix" branch onto "main" using git cherry-pick, then reset "hotfix" back by 1 commit.',
    hints: ['git switch main', 'git cherry-pick hotfix', 'git switch hotfix', 'git reset --hard HEAD~1'],
    init: () => {
      let s = gitSimulator.initialize()
      s = gitSimulator.execute(s, { type: 'init' }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Release v1.0.0' }).nextState
      s = gitSimulator.execute(s, { type: 'switch', name: 'hotfix', create: true }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Critical security patch', changes: { 'auth.ts': 'secure-token' } }).nextState
      s = gitSimulator.execute(s, { type: 'commit', message: 'Experimental WIP', changes: { 'ui.ts': 'wip' } }).nextState
      s = gitSimulator.execute(s, { type: 'switch', name: 'main' }).nextState
      return s
    },
    parse: parseGitCommand,
    execute: (s: GitState, a: GitAction) => gitSimulator.execute(s, a),
    requirements: [
      {
        label: 'main branch contains the "Critical security patch" commit',
        check: (s: GitState) => {
          const headId = s.branches.main?.head
          return headId ? s.commits[headId]?.message === 'Critical security patch' : false
        },
      },
      {
        label: 'hotfix branch pointer is rewound to the patch commit (HEAD~1)',
        check: (s: GitState) => {
          const hotfixHead = s.branches.hotfix?.head
          return hotfixHead ? s.commits[hotfixHead]?.message === 'Critical security patch' : false
        },
      },
    ],
  },
  {
    id: 'docker-compose-challenge',
    title: 'Deploy & Scale 3 Web Replicas',
    domain: 'docker',
    level: 'Intermediate',
    objective: 'Deploy the "shop" project stack using Docker Compose, then scale the "web" service horizontally to 3 replicas.',
    hints: ['compose up: launches db, redis, web', 'compose scale: scale web=3'],
    init: () => {
      let s = dockerSimulator.initialize()
      s = dockerSimulator.execute(s, { type: 'pull', ref: 'node:20', layers: ['node-base', 'npm'] }).nextState
      s = dockerSimulator.execute(s, { type: 'pull', ref: 'redis:7', layers: ['redis-base'] }).nextState
      s = dockerSimulator.execute(s, { type: 'pull', ref: 'postgres:16', layers: ['pg-base'] }).nextState
      return s
    },
    execute: (s: DockerState, a: DockerAction) => dockerSimulator.execute(s, a),
    requirements: [
      {
        label: 'Compose network "shop_default" created',
        check: (s: DockerState) => s.networks.includes('shop_default'),
      },
      {
        label: 'Persistent volume "pg_data" mounted to database',
        check: (s: DockerState) => s.volumes.some((v) => v.name === 'pg_data'),
      },
      {
        label: 'At least 3 running web replicas active',
        check: (s: DockerState) => s.containers.filter((c) => c.name.startsWith('shop-web') && c.status === 'running').length >= 3,
      },
    ],
  },
  {
    id: 'kafka-zero-lag',
    title: 'Zero Consumer Lag',
    domain: 'kafka',
    level: 'Advanced',
    objective: 'A topic has unconsumed records. Have a worker join consumer group "analytics", poll and commit records until cluster lag is 0.',
    hints: ['join analytics worker-1', 'poll analytics'],
    init: () => {
      let s = kafkaSimulator.initialize({ brokers: 3 })
      s = kafkaSimulator.execute(s, { type: 'createTopic', name: 'telemetry', partitions: 3 }).nextState
      s = kafkaSimulator.execute(s, { type: 'produce', key: 'device-1', value: 'ping' }).nextState
      s = kafkaSimulator.execute(s, { type: 'produce', key: 'device-2', value: 'ping' }).nextState
      s = kafkaSimulator.execute(s, { type: 'produce', key: 'device-3', value: 'ping' }).nextState
      s = kafkaSimulator.execute(s, { type: 'produce', key: 'device-4', value: 'ping' }).nextState
      return s
    },
    execute: (s: KafkaState, a: KafkaAction) => kafkaSimulator.execute(s, a),
    requirements: [
      {
        label: 'Consumer group "analytics" created with active member',
        check: (s: KafkaState) => s.groups.some((g) => g.id === 'analytics' && g.members.length > 0),
      },
      {
        label: 'Consumer lag is exactly 0 (all partition offsets committed)',
        check: (s: KafkaState) => {
          const group = s.groups.find((g) => g.id === 'analytics')
          return group ? groupLag(s, group) === 0 : false
        },
      },
    ],
  },
  {
    id: 'k8s-self-healing',
    title: 'Self-Healing ReplicaSet',
    domain: 'kubernetes',
    level: 'Beginner',
    objective: 'Create a deployment named "frontend" with 3 replicas, delete one pod to simulate a node crash, and verify the ReplicaSet self-heals.',
    hints: ['kubectl create deployment frontend --image=nginx --replicas=3', 'kubectl delete pod frontend'],
    init: () => k8sSimulator.initialize({ nodes: 3 }),
    execute: (s: K8sState, a: K8sAction) => k8sSimulator.execute(s, a),
    requirements: [
      {
        label: 'Deployment "frontend" exists with 3 desired replicas',
        check: (s: K8sState) => s.deployments.some((d) => d.name === 'frontend' && d.replicas === 3),
      },
      {
        label: 'Cluster maintains exactly 3 running pods matching frontend',
        check: (s: K8sState) => s.pods.filter((p) => p.deployment === 'frontend' && p.status === 'Running').length === 3,
      },
    ],
  },
]

export default function ChallengesPage() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const challenge = CHALLENGES[selectedIdx]

  const [state, setState] = useState(() => challenge.init())
  const [history, setHistory] = useState<Frame[]>([])
  const [solved, setSolved] = useState(false)

  const resetChallenge = (idx: number) => {
    setSelectedIdx(idx)
    setState(CHALLENGES[idx].init())
    setHistory([])
    setSolved(false)
  }

  const allPassed = challenge.requirements.every((r) => r.check(state))

  const handleRun = (cmd: string) => {
    const trimmed = cmd.trim()
    let action: any

    if (challenge.domain === 'git') {
      const parsed = challenge.parse ? challenge.parse(trimmed) : null
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        setHistory((h) => [...h, { state, events: [], cmd: trimmed, feedback: parsed.error, status: 'failure' }])
        return
      }
      action = parsed
    } else if (challenge.domain === 'docker') {
      if (trimmed.includes('compose up')) {
        action = {
          type: 'composeUp',
          project: 'shop',
          services: [
            { name: 'db', image: 'postgres:16', volume: { name: 'pg_data', path: '/data' } },
            { name: 'redis', image: 'redis:7' },
            { name: 'web', image: 'node:20', ports: ['3000:3000'], dependsOn: ['db', 'redis'] },
          ],
        }
      } else if (trimmed.includes('scale web=')) {
        const count = Number(trimmed.split('web=')[1]) || 3
        action = { type: 'composeScale', project: 'shop', service: 'web', replicas: count }
      }
    } else if (challenge.domain === 'kafka') {
      if (trimmed.startsWith('join')) {
        const [, g, m] = trimmed.split(' ')
        action = { type: 'join', group: g || 'analytics', member: m || 'worker-1' }
      } else if (trimmed.startsWith('poll')) {
        const [, g] = trimmed.split(' ')
        action = { type: 'poll', group: g || 'analytics' }
      }
    } else if (challenge.domain === 'kubernetes') {
      if (trimmed.includes('create deployment')) {
        action = { type: 'createDeployment', name: 'frontend', image: 'nginx', replicas: 3 }
      } else if (trimmed.includes('delete pod')) {
        action = { type: 'deletePod', name: 'frontend' }
      }
    }

    if (!action) {
      setHistory((h) => [...h, { state, events: [], cmd: trimmed, feedback: `Command recognized in preset hints: ${challenge.hints.join(' | ')}`, status: 'failure' }])
      return
    }

    const res = challenge.execute(state, action)
    setState(res.nextState)
    setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])

    if (challenge.requirements.every((r) => r.check(res.nextState))) {
      setSolved(true)
    }
  }

  return (
    <ShellProvider>
      <div className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
        <AppHeader />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 xl:flex-row">
          {/* Challenges List Sidebar */}
          <aside className="w-full shrink-0 rounded-2xl border border-ink/30 bg-card/60 p-3 xl:w-72">
            <div className="flex items-center gap-2 px-1 pt-1 pb-3 text-sm font-bold">
              <Trophy className="size-4 text-strong-yellow" aria-hidden="true" />
              <span>Challenges ({CHALLENGES.length})</span>
            </div>

            <ul className="flex flex-col gap-1.5">
              {CHALLENGES.map((c, i) => {
                const active = i === selectedIdx
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => resetChallenge(i)}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-colors',
                        active
                          ? 'border-[1.5px] border-ink bg-tint-green font-semibold hard-shadow-sm'
                          : 'border-ink/20 hover:bg-accent',
                      )}
                    >
                      <Terminal className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-bold">{c.title}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">{c.domain}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{c.objective}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Main Challenge Arena */}
          <main className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-ink/30 bg-card/40 p-3 xl:min-h-0 xl:overflow-y-auto">
            <header className="flex flex-wrap items-start justify-between gap-3 px-1 pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {challenge.domain} Track • {challenge.level}
                </span>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{challenge.title}</h1>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{challenge.objective}</p>
              </div>

              <button
                type="button"
                onClick={() => resetChallenge(selectedIdx)}
                className="flex items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold hard-shadow-sm hover:bg-accent"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset
              </button>
            </header>

            {/* Success Celebration Banner */}
            {allPassed && (
              <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-ink bg-tint-green p-3 hard-shadow-sm">
                <Sparkles className="size-5 shrink-0 text-strong-green" aria-hidden="true" />
                <div className="flex-1 text-xs">
                  <span className="font-bold">Challenge Completed! 🏆</span> You successfully achieved all target criteria for this scenario.
                </div>
              </div>
            )}

            {/* Target Requirements Checklist */}
            <div className="rounded-xl border border-ink/30 bg-card p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Criteria</span>
              <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {challenge.requirements.map((req, ri) => {
                  const pass = req.check(state)
                  return (
                    <li
                      key={ri}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-2 text-xs font-medium',
                        pass ? 'border-strong-green/50 bg-tint-green/40 text-foreground' : 'border-ink/20 text-muted-foreground',
                      )}
                    >
                      {pass ? (
                        <CheckCircle2 className="size-4 shrink-0 text-strong-green" aria-hidden="true" />
                      ) : (
                        <Circle className="size-4 shrink-0" aria-hidden="true" />
                      )}
                      <span>{req.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Live Interactive Visualization Viewport */}
            <div className="canvas-dots relative min-h-[340px] flex-1 overflow-hidden rounded-xl border border-ink/30 bg-card/60 p-2">
              <div className="absolute inset-0 p-2">
                {challenge.domain === 'git' && <GitGraph state={state} events={history.at(-1)?.events ?? []} />}
                {challenge.domain === 'docker' && <DockerHost state={state} events={history.at(-1)?.events ?? []} />}
                {challenge.domain === 'kafka' && <KafkaCluster state={state} events={history.at(-1)?.events ?? []} />}
                {challenge.domain === 'kubernetes' && <K8sCluster state={state} events={history.at(-1)?.events ?? []} />}
              </div>
            </div>

            {/* Command Console */}
            <CommandConsole
              lines={history}
              interactive={true}
              hints={challenge.hints}
              onRun={handleRun}
              pendingCount={0}
            />
          </main>
        </div>
      </div>
    </ShellProvider>
  )
}

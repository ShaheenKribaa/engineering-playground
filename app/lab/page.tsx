'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/playground/app-header'
import { ShellProvider } from '@/components/playground/shell-context'
import { CommandConsole } from '@/components/playground/command-console'
import { GitGraph } from '@/components/playground/viz/git-graph'
import { DockerHost } from '@/components/playground/viz/docker-host'
import { KafkaCluster } from '@/components/playground/viz/kafka-cluster'
import { K8sCluster } from '@/components/playground/viz/k8s-cluster'
import { NetworkFlow } from '@/components/playground/viz/network-flow'
import { CicdPipeline } from '@/components/playground/viz/cicd-pipeline'
import { gitSimulator, parseGitCommand, type GitState, type GitAction } from '@/lib/sim/git'
import { dockerSimulator, type DockerState, type DockerAction } from '@/lib/sim/docker'
import { kafkaSimulator, type KafkaState, type KafkaAction } from '@/lib/sim/kafka'
import { k8sSimulator, type K8sState, type K8sAction } from '@/lib/sim/k8s'
import { networkingSimulator, type NetworkState, type NetworkAction } from '@/lib/sim/networking'
import { cicdSimulator, type CicdState, type CicdAction } from '@/lib/sim/cicd'
import type { Frame } from '@/lib/sim/timeline'
import { FlaskConical, RotateCcw, Code2, Play, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type SimType = 'git' | 'docker' | 'kafka' | 'kubernetes' | 'networking' | 'cicd'

export default function SimLabPage() {
  const [activeSim, setActiveSim] = useState<SimType>('git')
  const [showInspector, setShowInspector] = useState(false)

  // Simulator States
  const [gitState, setGitState] = useState<GitState>(() => {
    let s = gitSimulator.initialize()
    s = gitSimulator.execute(s, { type: 'init' }).nextState
    s = gitSimulator.execute(s, { type: 'commit', message: 'Initial commit' }).nextState
    return s
  })
  const [dockerState, setDockerState] = useState<DockerState>(() => {
    let s = dockerSimulator.initialize()
    s = dockerSimulator.execute(s, { type: 'pull', ref: 'nginx:alpine', layers: ['layer-1', 'layer-2'] }).nextState
    s = dockerSimulator.execute(s, { type: 'run', name: 'web-1', image: 'nginx:alpine', ports: ['80:80'] }).nextState
    return s
  })
  const [kafkaState, setKafkaState] = useState<KafkaState>(() => {
    let s = kafkaSimulator.initialize({ brokers: 3 })
    s = kafkaSimulator.execute(s, { type: 'createTopic', name: 'orders', partitions: 3 }).nextState
    return s
  })
  const [k8sState, setK8sState] = useState<K8sState>(() => {
    let s = k8sSimulator.initialize({ nodes: 3 })
    s = k8sSimulator.execute(s, { type: 'createDeployment', name: 'api-service', image: 'api:v1', replicas: 3 }).nextState
    return s
  })
  const [netState, setNetState] = useState<NetworkState>(() => networkingSimulator.initialize())
  const [cicdState, setCicdState] = useState<CicdState>(() => cicdSimulator.initialize())

  const [history, setHistory] = useState<Frame[]>([])

  const currentEvents = history.at(-1)?.events ?? []

  const resetCurrent = () => {
    setHistory([])
    if (activeSim === 'git') {
      let s = gitSimulator.initialize()
      s = gitSimulator.execute(s, { type: 'init' }).nextState
      setGitState(s)
    } else if (activeSim === 'docker') {
      setDockerState(dockerSimulator.initialize())
    } else if (activeSim === 'kafka') {
      setKafkaState(kafkaSimulator.initialize({ brokers: 3 }))
    } else if (activeSim === 'kubernetes') {
      setK8sState(k8sSimulator.initialize({ nodes: 3 }))
    } else if (activeSim === 'networking') {
      setNetState(networkingSimulator.initialize())
    } else if (activeSim === 'cicd') {
      setCicdState(cicdSimulator.initialize())
    }
  }

  const handleRun = (cmd: string) => {
    const trimmed = cmd.trim()
    if (activeSim === 'git') {
      const parsed = parseGitCommand(trimmed)
      if (typeof parsed === 'object' && 'error' in parsed) {
        setHistory((h) => [...h, { state: gitState, events: [], cmd: trimmed, feedback: parsed.error, status: 'failure' }])
        return
      }
      const res = gitSimulator.execute(gitState, parsed)
      setGitState(res.nextState)
      setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
    } else if (activeSim === 'docker') {
      let action: DockerAction | null = null
      if (trimmed.startsWith('docker run')) {
        const parts = trimmed.split(' ')
        const name = parts[parts.indexOf('--name') + 1] || 'worker-' + Math.floor(Math.random() * 90 + 10)
        action = { type: 'run', name, image: 'nginx:alpine', ports: ['8080:80'] }
      } else if (trimmed.includes('compose up')) {
        action = {
          type: 'composeUp',
          project: 'lab',
          services: [
            { name: 'db', image: 'postgres:16', volume: { name: 'db_data', path: '/data' } },
            { name: 'web', image: 'node:20', ports: ['3000:3000'] },
          ],
        }
      } else if (trimmed.includes('compose down')) {
        action = { type: 'composeDown', project: 'lab' }
      }
      if (action) {
        const res = dockerSimulator.execute(dockerState, action)
        setDockerState(res.nextState)
        setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
      } else {
        setHistory((h) => [...h, { state: dockerState, events: [], cmd: trimmed, feedback: 'Try: docker run --name my-app | docker compose up -d | docker compose down', status: 'failure' }])
      }
    } else if (activeSim === 'kafka') {
      let action: KafkaAction | null = null
      if (trimmed.startsWith('produce')) {
        const [, key, val] = trimmed.split(' ')
        action = { type: 'produce', key: key || 'user-1', value: val || 'payload' }
      } else if (trimmed.startsWith('join')) {
        const [, g, m] = trimmed.split(' ')
        action = { type: 'join', group: g || 'consumers', member: m || 'worker-1' }
      } else if (trimmed.startsWith('poll')) {
        const [, g] = trimmed.split(' ')
        action = { type: 'poll', group: g || 'consumers' }
      }
      if (action) {
        const res = kafkaSimulator.execute(kafkaState, action)
        setKafkaState(res.nextState)
        setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
      } else {
        setHistory((h) => [...h, { state: kafkaState, events: [], cmd: trimmed, feedback: 'Try: produce user-100 data | join consumers worker-1 | poll consumers', status: 'failure' }])
      }
    } else if (activeSim === 'kubernetes') {
      let action: K8sAction | null = null
      if (trimmed.includes('scale')) {
        const count = Number(trimmed.split('replicas=')[1]) || 5
        action = { type: 'scale', name: 'api-service', replicas: count }
      } else if (trimmed.includes('delete pod')) {
        action = { type: 'deletePod', name: 'api-service' }
      } else if (trimmed.includes('curl')) {
        action = { type: 'sendTraffic', service: 'api-service' }
      }
      if (action) {
        const res = k8sSimulator.execute(k8sState, action)
        setK8sState(res.nextState)
        setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
      } else {
        setHistory((h) => [...h, { state: k8sState, events: [], cmd: trimmed, feedback: 'Try: kubectl scale deployment api-service --replicas=5 | kubectl delete pod api-service | curl http://api-service:80', status: 'failure' }])
      }
    } else if (activeSim === 'networking') {
      let action: NetworkAction | null = null
      if (trimmed.startsWith('dig')) {
        action = { type: 'dnsQuery', domain: trimmed.split(' ')[1] || 'api.example.com' }
      } else if (trimmed.startsWith('connect') || trimmed.includes('syn')) {
        action = { type: 'tcpSyn' }
      } else if (trimmed.includes('tls')) {
        action = { type: 'tlsClientHello' }
      } else if (trimmed.includes('flush')) {
        action = { type: 'flushDns' }
      }
      if (action) {
        const res = networkingSimulator.execute(netState, action)
        setNetState(res.nextState)
        setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
      } else {
        setHistory((h) => [...h, { state: netState, events: [], cmd: trimmed, feedback: 'Try: dig example.com | connect | tls | flush', status: 'failure' }])
      }
    } else if (activeSim === 'cicd') {
      let action: CicdAction | null = null
      if (trimmed.includes('push') || trimmed.includes('trigger')) {
        action = { type: 'trigger', branch: 'main', commit: '8f2a1b0' }
      } else if (trimmed.includes('lint')) {
        action = { type: 'runStage', stageId: 'lint' }
      } else if (trimmed.includes('test')) {
        action = { type: 'runStage', stageId: 'test' }
      } else if (trimmed.includes('build')) {
        action = { type: 'runStage', stageId: 'build' }
      } else if (trimmed.includes('deploy')) {
        action = { type: 'deploy', environment: 'production' }
      }
      if (action) {
        const res = cicdSimulator.execute(cicdState, action)
        setCicdState(res.nextState)
        setHistory((h) => [...h, { state: res.nextState, events: res.events, cmd: trimmed, feedback: res.feedback, status: res.status }])
      } else {
        setHistory((h) => [...h, { state: cicdState, events: [], cmd: trimmed, feedback: 'Try: git push origin main | run lint | run test | run build | deploy production', status: 'failure' }])
      }
    }
  }

  const getHints = () => {
    switch (activeSim) {
      case 'git':
        return ['git commit -m "feat: login"', 'git switch -c feature', 'git rebase main', 'git cherry-pick <hash>', 'git reset --hard HEAD~1', 'git log']
      case 'docker':
        return ['docker run --name app-2', 'docker compose up -d', 'docker compose down']
      case 'kafka':
        return ['produce user-101 order-placed', 'join billing worker-1', 'poll billing']
      case 'kubernetes':
        return ['kubectl scale deployment api-service --replicas=5', 'kubectl delete pod api-service', 'curl http://api-service:80']
      case 'networking':
        return ['dig api.stripe.com', 'connect (TCP SYN)', 'tls (Client Hello)', 'flush (clear cache)']
      case 'cicd':
        return ['git push origin main', 'run lint', 'run test', 'run build', 'deploy production']
    }
  }

  const getActiveStateObject = () => {
    switch (activeSim) {
      case 'git':
        return gitState
      case 'docker':
        return dockerState
      case 'kafka':
        return kafkaState
      case 'kubernetes':
        return k8sState
      case 'networking':
        return netState
      case 'cicd':
        return cicdState
    }
  }

  return (
    <ShellProvider>
      <div className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
        <AppHeader />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 xl:flex-row">
          {/* Main Lab Canvas */}
          <main className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-ink/30 bg-card/40 p-3 xl:min-h-0 xl:overflow-y-auto">
            <header className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md border border-ink bg-tint-yellow hard-shadow-sm">
                  <FlaskConical className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Sim Lab</h1>
                  <p className="text-xs text-muted-foreground">Unrestricted interactive playground with live architectural feedback.</p>
                </div>
              </div>

              {/* Domain Simulator Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink/30 bg-card p-1">
                {(['git', 'docker', 'kafka', 'kubernetes', 'networking', 'cicd'] as SimType[]).map((sim) => (
                  <button
                    key={sim}
                    type="button"
                    onClick={() => {
                      setActiveSim(sim)
                      setHistory([])
                    }}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors',
                      activeSim === sim
                        ? 'border border-ink bg-tint-green text-foreground hard-shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {sim}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInspector((s) => !s)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border-[1.5px] border-ink px-3 py-1.5 text-xs font-semibold hard-shadow-sm',
                    showInspector ? 'bg-tint-yellow' : 'bg-card hover:bg-accent',
                  )}
                >
                  <Code2 className="size-3.5" aria-hidden="true" />
                  State JSON
                </button>
                <button
                  type="button"
                  onClick={resetCurrent}
                  className="flex items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold hard-shadow-sm hover:bg-accent"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </header>

            {/* Split viewport: Canvas & optional JSON Inspector */}
            <div className="flex min-h-[360px] flex-1 gap-3">
              <div className="canvas-dots relative flex-1 overflow-hidden rounded-xl border border-ink/30 bg-card/60 p-2">
                <div className="absolute inset-0 p-2">
                  {activeSim === 'git' && <GitGraph state={gitState} events={currentEvents as any} />}
                  {activeSim === 'docker' && <DockerHost state={dockerState} events={currentEvents as any} />}
                  {activeSim === 'kafka' && <KafkaCluster state={kafkaState} events={currentEvents as any} />}
                  {activeSim === 'kubernetes' && <K8sCluster state={k8sState} events={currentEvents as any} />}
                  {activeSim === 'networking' && <NetworkFlow state={netState} events={currentEvents as any} />}
                  {activeSim === 'cicd' && <CicdPipeline state={cicdState} events={currentEvents as any} />}
                </div>
              </div>

              {showInspector && (
                <div className="w-80 shrink-0 overflow-y-auto rounded-xl border border-ink/30 bg-card p-3 font-mono text-[11px]">
                  <div className="mb-2 font-bold uppercase tracking-wider text-muted-foreground">Simulator State Snapshot</div>
                  <pre className="overflow-x-auto text-xs whitespace-pre-wrap">{JSON.stringify(getActiveStateObject(), null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Interactive Console */}
            <CommandConsole
              lines={history}
              interactive={true}
              hints={getHints()}
              onRun={handleRun}
              pendingCount={0}
            />
          </main>
        </div>
      </div>
    </ShellProvider>
  )
}

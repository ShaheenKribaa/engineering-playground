'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/playground/app-header'
import { ShellProvider } from '@/components/playground/shell-context'
import { Check, Copy, ScrollText, Search, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CheatsheetEntry {
  domain: 'git' | 'docker' | 'kafka' | 'kubernetes' | 'networking' | 'cicd'
  command: string
  title: string
  description: string
  tip?: string
}

const CHEATSHEETS: CheatsheetEntry[] = [
  // Git
  {
    domain: 'git',
    command: 'git switch -c <branch>',
    title: 'Create & Switch Branch',
    description: 'Creates a new branch pointer at HEAD and moves HEAD to it. Preferred over older `git checkout -b`.',
    tip: 'Branch creation is instantaneous: it only writes a 41-byte text file with the commit SHA.',
  },
  {
    domain: 'git',
    command: 'git rebase <upstream>',
    title: 'Linear Rebase',
    description: 'Replays commits from your current branch on top of the tip of <upstream>. Recreates commits with new SHAs.',
    tip: 'Rule of thumb: rebase local unpublished branches, never rebase shared public branches like main.',
  },
  {
    domain: 'git',
    command: 'git cherry-pick <commit-sha>',
    title: 'Surgical Commit Copy',
    description: 'Extracts the changes from a specific commit on another branch and applies them as a new commit on HEAD.',
    tip: 'Essential for backporting critical bug fixes to production without merging unfinished feature branches.',
  },
  {
    domain: 'git',
    command: 'git reset --hard HEAD~1',
    title: 'Rewind Branch Tip',
    description: 'Moves the current branch pointer backward by 1 commit and discards working tree changes.',
    tip: 'The rewound commit becomes dangling. Use `git reflog` if you need to recover it.',
  },
  {
    domain: 'git',
    command: 'git stash && git stash pop',
    title: 'Temporary Work Shelf',
    description: 'Temporarily saves uncommitted changes to a local stack and restores them when ready.',
  },
  {
    domain: 'git',
    command: 'git merge --abort',
    title: 'Abort Conflicted Merge',
    description: 'Safely exits an in-progress merge conflict and resets the working tree back to the pre-merge state.',
  },

  // Docker
  {
    domain: 'docker',
    command: 'docker run -d -p 8080:80 --name web nginx:alpine',
    title: 'Run Container with Port Forward',
    description: 'Runs an image in detached background mode, publishing host port 8080 to container port 80.',
  },
  {
    domain: 'docker',
    command: 'docker compose up -d',
    title: 'Boot Multi-Container Stack',
    description: 'Reads compose.yaml, creates default network and volumes, and starts all declared services.',
  },
  {
    domain: 'docker',
    command: 'docker compose up -d --scale web=3',
    title: 'Scale Stateless Service',
    description: 'Scales the web service to 3 identical worker containers attached to the same internal network.',
  },
  {
    domain: 'docker',
    command: 'docker compose down -v',
    title: 'Teardown Stack & Volumes',
    description: 'Stops and removes all containers and networks. `-v` also cleans up project named volumes.',
  },
  {
    domain: 'docker',
    command: 'docker network create my-net',
    title: 'User-Defined Bridge Network',
    description: 'Creates a bridge network with automatic embedded DNS service discovery between containers.',
  },

  // Kafka
  {
    domain: 'kafka',
    command: 'kafka-topics.sh --create --topic orders --partitions 3 --replication-factor 3',
    title: 'Create Replicated Topic',
    description: 'Initializes a topic with 3 parallel partition logs distributed with redundancy across 3 broker nodes.',
  },
  {
    domain: 'kafka',
    command: 'kafka-console-producer.sh --topic orders --property parse.key=true --property key.separator=:',
    title: 'Publish Keyed Events',
    description: 'Streams messages where the key determines partition hashing (Murmur2 hash % partition count).',
  },
  {
    domain: 'kafka',
    command: 'kafka-console-consumer.sh --topic orders --group billing-group',
    title: 'Join Consumer Group',
    description: 'Joins a consumer group. Partitions are assigned via RangeAssignor; commits track offset progress.',
  },
  {
    domain: 'kafka',
    command: 'kafka-consumer-groups.sh --describe --group billing-group',
    title: 'Inspect Consumer Lag',
    description: 'Displays current log end offset vs committed offset per partition. Lag = LogEnd - Committed.',
  },

  // Kubernetes
  {
    domain: 'kubernetes',
    command: 'kubectl create deployment api --image=nginx --replicas=3',
    title: 'Create Managed Deployment',
    description: 'Declares desired state: ReplicaSet controller manages 3 pods running nginx across worker nodes.',
  },
  {
    domain: 'kubernetes',
    command: 'kubectl scale deployment api --replicas=5',
    title: 'Declarative Horizontal Scaling',
    description: 'Scales pod instances up or down without downtime or service disruption.',
  },
  {
    domain: 'kubernetes',
    command: 'kubectl expose deployment api --port=80 --target-port=8080 --type=ClusterIP',
    title: 'Expose Internal Service (ClusterIP)',
    description: 'Creates a virtual IP (VIP) and internal DNS entry that load balances requests across healthy pods.',
  },
  {
    domain: 'kubernetes',
    command: 'kubectl get pods -o wide',
    title: 'List Pods with Node & IP Details',
    description: 'Lists all pods, their internal overlay network IPs, and which physical worker node hosts each pod.',
  },

  // Networking
  {
    domain: 'networking',
    command: 'dig +trace example.com',
    title: 'Trace Iterative DNS Query',
    description: 'Walks the DNS hierarchy from Root nameservers (.) to .com TLD to Authoritative nameservers.',
  },
  {
    domain: 'networking',
    command: 'curl -Iv https://example.com',
    title: 'Inspect TLS Handshake & Headers',
    description: 'Prints TCP connection establishment, TLS 1.3 cipher suite negotiation, certificate info, and HTTP headers.',
  },
  {
    domain: 'networking',
    command: 'resolvectl flush-caches',
    title: 'Flush DNS Resolver Cache',
    description: 'Purges local cached DNS records to force a fresh lookup from authoritative nameservers.',
  },

  // CI/CD
  {
    domain: 'cicd',
    command: 'docker build -t registry.io/app:${GITHUB_SHA} .',
    title: 'Build Immutable OCI Artifact',
    description: 'Packages source code into an immutable container image tagged with the exact Git commit SHA.',
  },
  {
    domain: 'cicd',
    command: 'kubectl apply -k ./overlays/production',
    title: 'GitOps Declarative Promotion',
    description: 'Applies Kubernetes manifests to promote a tested artifact from staging to production.',
  },
]

export default function CheatsheetsPage() {
  const [query, setQuery] = useState('')
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCmd(text)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const filtered = CHEATSHEETS.filter((item) => {
    const matchesDomain = filterDomain === 'all' || item.domain === filterDomain
    const q = query.toLowerCase().trim()
    const matchesSearch =
      !q ||
      item.command.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    return matchesDomain && matchesSearch
  })

  return (
    <ShellProvider>
      <div className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
        <AppHeader />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3">
          <main className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-ink/30 bg-card/40 p-4 xl:min-h-0 xl:overflow-y-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md border border-ink bg-tint-green hard-shadow-sm">
                  <ScrollText className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Interactive Cheatsheets</h1>
                  <p className="text-xs text-muted-foreground">Quick reference and CLI syntax for Git, Docker, Kafka, K8s, Networking, and CI/CD.</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, flags, keywords…"
                  className="h-9 w-full rounded-md border border-ink/40 bg-card pr-3 pl-9 text-xs"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'git', 'docker', 'kafka', 'kubernetes', 'networking', 'cicd'].map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setFilterDomain(dom)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
                    filterDomain === dom
                      ? 'border border-ink bg-tint-yellow text-foreground hard-shadow-sm'
                      : 'border border-ink/20 bg-card hover:bg-accent',
                  )}
                >
                  {dom}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">{filtered.length} commands found</span>
            </div>

            {/* Cheatsheets Cards Grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-ink/30 bg-card p-3.5 hard-shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {item.domain}
                      </span>
                      <Link
                        href="/lab"
                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                        title="Test in Sim Lab"
                      >
                        <span>Sim Lab</span>
                        <ExternalLink className="size-2.5" />
                      </Link>
                    </div>

                    <h2 className="mt-1 text-sm font-bold">{item.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>

                  <div className="mt-3">
                    <div className="relative flex items-center justify-between rounded-md border border-ink/40 bg-card/80 p-2 font-mono text-[11px]">
                      <code className="truncate pr-7 font-bold">{item.command}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.command)}
                        className="absolute right-1.5 flex size-6 items-center justify-center rounded hover:bg-accent"
                        title="Copy command"
                      >
                        {copiedCmd === item.command ? (
                          <Check className="size-3 text-strong-green" />
                        ) : (
                          <Copy className="size-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {item.tip && (
                      <p className="mt-2 text-[10.5px] italic text-muted-foreground">
                        💡 <span className="font-semibold">Tip:</span> {item.tip}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </ShellProvider>
  )
}

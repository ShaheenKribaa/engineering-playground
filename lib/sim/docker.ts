import { fail, ok, shortHash, type SimulationResult, type Simulator } from './types'

export interface DockerLayer {
  id: string
  label: string
  cached: boolean
}

export interface DockerImage {
  ref: string
  layers: DockerLayer[]
  source: 'pulled' | 'built'
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped'
  ports: string[]
  networks: string[]
  mounts: { volume: string; path: string }[]
  seq: number
}

export interface DockerVolume {
  name: string
  data: string[]
}

export interface DockerState {
  images: DockerImage[]
  containers: DockerContainer[]
  networks: string[]
  volumes: DockerVolume[]
  seq: number
}

export type DockerAction =
  | { type: 'pull'; ref: string; layers: string[] }
  | { type: 'build'; ref: string; layers: string[] }
  | {
      type: 'run'
      name: string
      image: string
      ports?: string[]
      network?: string
      mount?: { volume: string; path: string }
    }
  | { type: 'stop'; name: string }
  | { type: 'rm'; name: string; force?: boolean }
  | { type: 'networkCreate'; name: string }
  | { type: 'networkConnect'; network: string; container: string }
  | { type: 'volumeCreate'; name: string }
  | { type: 'write'; container: string; data: string }
  | { type: 'composeUp'; project: string; services: ComposeService[] }
  | { type: 'composeDown'; project: string; volumes?: boolean }
  | { type: 'composeScale'; project: string; service: string; replicas: number }

export interface ComposeService {
  name: string
  image: string
  ports?: string[]
  volume?: { name: string; path: string }
  dependsOn?: string[]
}

export type DockerEvent =
  | { type: 'IMAGE_ADDED'; ref: string }
  | { type: 'CONTAINER_STARTED'; name: string }
  | { type: 'CONTAINER_STOPPED'; name: string }
  | { type: 'CONTAINER_REMOVED'; name: string }
  | { type: 'NETWORK_CREATED'; name: string }
  | { type: 'NETWORK_CONNECTED'; network: string; container: string }
  | { type: 'VOLUME_CREATED'; name: string }
  | { type: 'VOLUME_WRITTEN'; name: string }

type Result = SimulationResult<DockerState, DockerEvent>

function addImage(state: DockerState, ref: string, labels: string[], source: DockerImage['source']): Result {
  const known = new Set(state.images.flatMap((i) => i.layers.map((l) => l.id)))
  const layers = labels.map((label) => {
    const id = shortHash(label, 12)
    return { id, label, cached: known.has(id) }
  })
  const image: DockerImage = { ref, layers, source }
  const lines = layers.map((l, i) =>
    source === 'built'
      ? `#${i + 1} ${l.label}${l.cached ? '  CACHED' : '  DONE'}`
      : `${l.id}: ${l.cached ? 'Already exists' : 'Pull complete'}`,
  )
  lines.push(source === 'built' ? `naming to docker.io/library/${ref}` : `Status: Downloaded newer image for ${ref}`)
  return ok(
    { ...state, images: [...state.images.filter((i) => i.ref !== ref), image] },
    [{ type: 'IMAGE_ADDED', ref }],
    lines.join('\n'),
  )
}

/** Order services so dependencies start first. Returns null on a cycle or unknown dependency. */
function startOrder(services: ComposeService[]): ComposeService[] | null {
  const byName = new Map(services.map((s) => [s.name, s]))
  const out: ComposeService[] = []
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (s: ComposeService): boolean => {
    const mark = state.get(s.name)
    if (mark === 'done') return true
    if (mark === 'visiting') return false
    state.set(s.name, 'visiting')
    for (const dep of s.dependsOn ?? []) {
      const d = byName.get(dep)
      if (!d || !visit(d)) return false
    }
    state.set(s.name, 'done')
    out.push(s)
    return true
  }
  for (const s of services) if (!visit(s)) return null
  return out
}

export function composeServiceOf(container: DockerContainer, project: string) {
  const prefix = `${project}-`
  if (!container.name.startsWith(prefix)) return null
  return container.name.slice(prefix.length).replace(/-\d+$/, '')
}

function updateContainer(state: DockerState, name: string, patch: Partial<DockerContainer>): DockerState {
  return { ...state, containers: state.containers.map((c) => (c.name === name ? { ...c, ...patch } : c)) }
}

export const dockerSimulator: Simulator<DockerState, DockerAction, DockerEvent, void> = {
  id: 'docker',
  version: '1.0.0',

  initialize() {
    return { images: [], containers: [], networks: ['bridge'], volumes: [], seq: 0 }
  },

  execute(state, action): Result {
    switch (action.type) {
      case 'pull':
        return addImage(state, action.ref, action.layers, 'pulled')
      case 'build':
        return addImage(state, action.ref, action.layers, 'built')

      case 'run': {
        if (!state.images.some((i) => i.ref === action.image)) {
          return fail(state, 'IMAGE_NOT_FOUND', `Unable to find image '${action.image}' locally`)
        }
        if (state.containers.some((c) => c.name === action.name)) {
          return fail(state, 'NAME_CONFLICT', `Conflict. The container name "/${action.name}" is already in use.`)
        }
        if (action.network && !state.networks.includes(action.network)) {
          return fail(state, 'NETWORK_NOT_FOUND', `network ${action.network} not found`)
        }
        let volumes = state.volumes
        if (action.mount && !volumes.some((v) => v.name === action.mount!.volume)) {
          volumes = [...volumes, { name: action.mount.volume, data: [] }]
        }
        const container: DockerContainer = {
          id: shortHash(`${state.seq}:${action.name}`, 12),
          name: action.name,
          image: action.image,
          status: 'running',
          ports: action.ports ?? [],
          networks: [action.network ?? 'bridge'],
          mounts: action.mount ? [action.mount] : [],
          seq: state.seq,
        }
        return ok(
          { ...state, volumes, containers: [...state.containers, container], seq: state.seq + 1 },
          [{ type: 'CONTAINER_STARTED', name: action.name }],
          container.id,
        )
      }

      case 'stop': {
        const c = state.containers.find((x) => x.name === action.name)
        if (!c) return fail(state, 'NO_SUCH_CONTAINER', `Error: No such container: ${action.name}`)
        return ok(
          updateContainer(state, action.name, { status: 'stopped' }),
          [{ type: 'CONTAINER_STOPPED', name: action.name }],
          action.name,
        )
      }

      case 'rm': {
        const c = state.containers.find((x) => x.name === action.name)
        if (!c) return fail(state, 'NO_SUCH_CONTAINER', `Error: No such container: ${action.name}`)
        if (c.status === 'running' && !action.force) {
          return fail(state, 'CONTAINER_RUNNING', `Error: cannot remove running container ${action.name}. Stop it or use -f`)
        }
        return ok(
          { ...state, containers: state.containers.filter((x) => x.name !== action.name) },
          [{ type: 'CONTAINER_REMOVED', name: action.name }],
          action.name,
        )
      }

      case 'networkCreate': {
        if (state.networks.includes(action.name)) {
          return fail(state, 'NETWORK_EXISTS', `network with name ${action.name} already exists`)
        }
        return ok(
          { ...state, networks: [...state.networks, action.name] },
          [{ type: 'NETWORK_CREATED', name: action.name }],
          shortHash(action.name, 12),
        )
      }

      case 'networkConnect': {
        const c = state.containers.find((x) => x.name === action.container)
        if (!c) return fail(state, 'NO_SUCH_CONTAINER', `Error: No such container: ${action.container}`)
        if (!state.networks.includes(action.network)) {
          return fail(state, 'NETWORK_NOT_FOUND', `network ${action.network} not found`)
        }
        const networks = [...c.networks.filter((n) => n !== 'bridge'), action.network]
        return ok(
          updateContainer(state, action.container, { networks }),
          [{ type: 'NETWORK_CONNECTED', network: action.network, container: action.container }],
          '',
        )
      }

      case 'volumeCreate': {
        if (state.volumes.some((v) => v.name === action.name)) return ok(state, [], action.name)
        return ok(
          { ...state, volumes: [...state.volumes, { name: action.name, data: [] }] },
          [{ type: 'VOLUME_CREATED', name: action.name }],
          action.name,
        )
      }

      case 'write': {
        const c = state.containers.find((x) => x.name === action.container)
        if (!c || c.status !== 'running') {
          return fail(state, 'NOT_RUNNING', `Error: container ${action.container} is not running`)
        }
        const mount = c.mounts[0]
        if (!mount) return ok(state, [], 'written to container layer (lost on removal)')
        return ok(
          {
            ...state,
            volumes: state.volumes.map((v) =>
              v.name === mount.volume ? { ...v, data: [...v.data, action.data] } : v,
            ),
          },
          [{ type: 'VOLUME_WRITTEN', name: mount.volume }],
          `INSERT 0 1  →  ${mount.volume}:${mount.path}`,
        )
      }

      case 'composeUp': {
        const ordered = startOrder(action.services)
        if (!ordered) return fail(state, 'BAD_DEPENDS_ON', 'service dependency cycle or unknown service in depends_on')
        const missing = ordered.find((s) => !state.images.some((i) => i.ref === s.image))
        if (missing) {
          return fail(state, 'IMAGE_NOT_FOUND', `Error: image ${missing.image} for service ${missing.name} not found — build or pull it first`)
        }
        const network = `${action.project}_default`
        const events: DockerEvent[] = []
        const lines: string[] = []
        let working = state
        if (!working.networks.includes(network)) {
          working = { ...working, networks: [...working.networks, network] }
          events.push({ type: 'NETWORK_CREATED', name: network })
          lines.push(`✔ Network ${network}  Created`)
        }
        for (const s of ordered) {
          if (s.volume && !working.volumes.some((v) => v.name === s.volume!.name)) {
            working = { ...working, volumes: [...working.volumes, { name: s.volume.name, data: [] }] }
            events.push({ type: 'VOLUME_CREATED', name: s.volume.name })
            lines.push(`✔ Volume ${s.volume.name}  Created`)
          }
        }
        for (const s of ordered) {
          const name = `${action.project}-${s.name}-1`
          if (working.containers.some((c) => c.name === name)) {
            lines.push(`✔ Container ${name}  Running`)
            continue
          }
          const container: DockerContainer = {
            id: shortHash(`${working.seq}:${name}`, 12),
            name,
            image: s.image,
            status: 'running',
            ports: s.ports ?? [],
            networks: [network],
            mounts: s.volume ? [s.volume] : [],
            seq: working.seq,
          }
          working = { ...working, containers: [...working.containers, container], seq: working.seq + 1 }
          events.push({ type: 'CONTAINER_STARTED', name })
          lines.push(`✔ Container ${name}  Started${s.dependsOn?.length ? `  (after ${s.dependsOn.join(', ')})` : ''}`)
        }
        return ok(working, events, lines.join('\n'))
      }

      case 'composeDown': {
        const network = `${action.project}_default`
        const owned = state.containers.filter((c) => composeServiceOf(c, action.project))
        const mounted = new Set(owned.flatMap((c) => c.mounts.map((m) => m.volume)))
        const events: DockerEvent[] = owned.map((c) => ({ type: 'CONTAINER_REMOVED', name: c.name }))
        const lines = [
          ...owned.map((c) => `✔ Container ${c.name}  Removed`),
          `✔ Network ${network}  Removed`,
          ...(action.volumes ? [...mounted].map((v) => `✔ Volume ${v}  Removed`) : []),
        ]
        return ok(
          {
            ...state,
            containers: state.containers.filter((c) => !owned.includes(c)),
            networks: state.networks.filter((n) => n !== network),
            volumes: action.volumes ? state.volumes.filter((v) => !mounted.has(v.name)) : state.volumes,
          },
          events,
          lines.join('\n'),
        )
      }

      case 'composeScale': {
        const replicas = state.containers.filter((c) => composeServiceOf(c, action.project) === action.service)
        const template = replicas[0]
        if (!template) return fail(state, 'NO_SUCH_SERVICE', `no such service: ${action.service}`)
        if (template.ports.length && action.replicas > 1) {
          return fail(
            state,
            'PORT_ALLOCATED',
            `Error: Bind for 0.0.0.0:${template.ports[0].split(':')[0]} failed: port is already allocated.\nhint: remove the host port from ${action.service} before scaling.`,
          )
        }
        let working = state
        const events: DockerEvent[] = []
        const lines: string[] = []
        for (let i = replicas.length + 1; i <= action.replicas; i++) {
          const name = `${action.project}-${action.service}-${i}`
          const container: DockerContainer = { ...template, id: shortHash(`${working.seq}:${name}`, 12), name, seq: working.seq }
          working = { ...working, containers: [...working.containers, container], seq: working.seq + 1 }
          events.push({ type: 'CONTAINER_STARTED', name })
          lines.push(`✔ Container ${name}  Started`)
        }
        for (const c of replicas.slice(action.replicas)) {
          working = { ...working, containers: working.containers.filter((x) => x.name !== c.name) }
          events.push({ type: 'CONTAINER_REMOVED', name: c.name })
          lines.push(`✔ Container ${c.name}  Removed`)
        }
        return ok(working, events, lines.join('\n') || `${action.service} already at ${action.replicas}`)
      }
    }
  },
}

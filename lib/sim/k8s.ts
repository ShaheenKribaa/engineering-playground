import { fail, ok, type SimulationResult, type Simulator } from './types'

export interface K8sPod {
  id: string
  name: string
  deployment: string
  node: string
  status: 'Pending' | 'Running' | 'Terminating'
  ip: string
}

export interface K8sNode {
  name: string
  cpu: number
  memory: string
  ready: boolean
}

export interface K8sDeployment {
  name: string
  image: string
  replicas: number
}

export interface K8sService {
  name: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  port: number
  targetPort: number
  selector: Record<string, string>
}

export interface K8sState {
  nodes: K8sNode[]
  deployments: K8sDeployment[]
  pods: K8sPod[]
  services: K8sService[]
  trafficTarget?: string
}

export type K8sAction =
  | { type: 'createDeployment'; name: string; image: string; replicas: number }
  | { type: 'scale'; name: string; replicas: number }
  | { type: 'deletePod'; name: string }
  | { type: 'createService'; name: string; type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'; port: number; targetPort: number; selector: Record<string, string> }
  | { type: 'sendTraffic'; service: string }

export type K8sEvent =
  | { type: 'DEPLOYMENT_CREATED'; name: string; replicas: number }
  | { type: 'POD_SCHEDULED'; pod: string; node: string }
  | { type: 'POD_TERMINATED'; pod: string }
  | { type: 'SERVICE_CREATED'; name: string }
  | { type: 'TRAFFIC_ROUTED'; service: string; targetPod: string }

type Result = SimulationResult<K8sState, K8sEvent>

export const k8sSimulator: Simulator<K8sState, K8sAction, K8sEvent, { nodes: number }> = {
  id: 'kubernetes',
  version: '1.0.0',

  initialize(config) {
    const nodes: K8sNode[] = Array.from({ length: config.nodes ?? 3 }, (_, i) => ({
      name: `node-${i + 1}`,
      cpu: 4,
      memory: '16Gi',
      ready: true,
    }))
    return {
      nodes,
      deployments: [],
      pods: [],
      services: [],
    }
  },

  execute(state, action): Result {
    switch (action.type) {
      case 'createDeployment': {
        if (state.deployments.some((d) => d.name === action.name)) {
          return fail(state, 'DEPLOYMENT_EXISTS', `deployment.apps/${action.name} already exists`)
        }
        const deployment: K8sDeployment = {
          name: action.name,
          image: action.image,
          replicas: action.replicas,
        }
        const newPods: K8sPod[] = []
        const events: K8sEvent[] = [{ type: 'DEPLOYMENT_CREATED', name: action.name, replicas: action.replicas }]

        for (let i = 1; i <= action.replicas; i++) {
          const node = state.nodes[(i - 1) % state.nodes.length].name
          const pod: K8sPod = {
            id: `pod-${action.name}-${i}`,
            name: `${action.name}-${Math.random().toString(36).substring(2, 7)}`,
            deployment: action.name,
            node,
            status: 'Running',
            ip: `10.244.${(i % 3) + 1}.${10 + i}`,
          }
          newPods.push(pod)
          events.push({ type: 'POD_SCHEDULED', pod: pod.name, node })
        }

        return ok(
          {
            ...state,
            deployments: [...state.deployments, deployment],
            pods: [...state.pods, ...newPods],
          },
          events,
          `deployment.apps/${action.name} created (${action.replicas} replicas scheduled across nodes)`,
        )
      }

      case 'scale': {
        const dep = state.deployments.find((d) => d.name === action.name)
        if (!dep) return fail(state, 'NOT_FOUND', `deployment.apps/${action.name} not found`)
        
        let pods = [...state.pods]
        const currentPods = pods.filter((p) => p.deployment === action.name)
        const events: K8sEvent[] = []

        if (action.replicas > currentPods.length) {
          const needed = action.replicas - currentPods.length
          for (let i = 1; i <= needed; i++) {
            const index = currentPods.length + i
            const node = state.nodes[(index - 1) % state.nodes.length].name
            const pod: K8sPod = {
              id: `pod-${action.name}-${Date.now()}-${i}`,
              name: `${action.name}-${Math.random().toString(36).substring(2, 7)}`,
              deployment: action.name,
              node,
              status: 'Running',
              ip: `10.244.${(index % 3) + 1}.${20 + index}`,
            }
            pods.push(pod)
            events.push({ type: 'POD_SCHEDULED', pod: pod.name, node })
          }
        } else if (action.replicas < currentPods.length) {
          const toRemove = currentPods.slice(action.replicas)
          toRemove.forEach((p) => events.push({ type: 'POD_TERMINATED', pod: p.name }))
          const removeIds = new Set(toRemove.map((p) => p.name))
          pods = pods.filter((p) => !removeIds.has(p.name))
        }

        const nextDeps = state.deployments.map((d) =>
          d.name === action.name ? { ...d, replicas: action.replicas } : d,
        )

        return ok(
          { ...state, deployments: nextDeps, pods },
          events,
          `deployment.apps/${action.name} scaled to ${action.replicas}`,
        )
      }

      case 'deletePod': {
        const pod = state.pods.find((p) => p.name === action.name || p.id === action.name)
        if (!pod) return fail(state, 'NOT_FOUND', `pod "${action.name}" not found`)
        
        const dep = state.deployments.find((d) => d.name === pod.deployment)
        const events: K8sEvent[] = [{ type: 'POD_TERMINATED', pod: pod.name }]
        let nextPods = state.pods.filter((p) => p.name !== pod.name)

        if (dep) {
          // ReplicaSet controller automatically self-heals by spawning a replacement pod
          const replacementNode = state.nodes[Math.floor(Math.random() * state.nodes.length)].name
          const replacement: K8sPod = {
            id: `pod-${dep.name}-${Date.now()}`,
            name: `${dep.name}-${Math.random().toString(36).substring(2, 7)}`,
            deployment: dep.name,
            node: replacementNode,
            status: 'Running',
            ip: `10.244.1.${Math.floor(Math.random() * 80) + 10}`,
          }
          nextPods.push(replacement)
          events.push({ type: 'POD_SCHEDULED', pod: replacement.name, node: replacementNode })
          return ok(
            { ...state, pods: nextPods },
            events,
            `pod "${pod.name}" deleted. ReplicaSet detected divergence and immediately launched replacement pod "${replacement.name}".`,
          )
        }

        return ok({ ...state, pods: nextPods }, events, `pod "${pod.name}" deleted`)
      }

      case 'createService': {
        const service: K8sService = {
          name: action.name,
          type: action.type ?? 'ClusterIP',
          port: action.port,
          targetPort: action.targetPort,
          selector: action.selector,
        }
        return ok(
          { ...state, services: [...state.services, service] },
          [{ type: 'SERVICE_CREATED', name: action.name }],
          `service/${action.name} created (${service.type} port ${action.port} -> ${action.targetPort})`,
        )
      }

      case 'sendTraffic': {
        const svc = state.services.find((s) => s.name === action.service)
        if (!svc) return fail(state, 'NOT_FOUND', `service "${action.service}" not found`)
        const eligiblePods = state.pods.filter((p) => p.status === 'Running')
        if (!eligiblePods.length) return fail(state, 'NO_ENDPOINTS', `service "${action.service}" has no healthy endpoints`)
        
        const chosen = eligiblePods[Math.floor(Math.random() * eligiblePods.length)]
        return ok(
          { ...state, trafficTarget: chosen.name },
          [{ type: 'TRAFFIC_ROUTED', service: svc.name, targetPod: chosen.name }],
          `Traffic routed via service/${svc.name} (${svc.type}) -> Pod ${chosen.name} (${chosen.ip}:${svc.targetPort}) on ${chosen.node}`,
        )
      }
    }
  },
}

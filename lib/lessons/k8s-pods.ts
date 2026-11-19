import { k8sSimulator, type K8sAction, type K8sEvent, type K8sState } from '@/lib/sim/k8s'
import type { Lesson } from './types'

export const k8sPodsLesson: Lesson<K8sState, K8sAction, K8sEvent> = {
  id: 'k8s-pods',
  domainId: 'kubernetes',
  title: 'Pods & Deployments',
  subtitle: 'Understand the smallest deployable units in Kubernetes and how Deployments orchestrate self-healing.',
  minutes: 15,
  level: 'Beginner',
  simulator: k8sSimulator,
  config: { nodes: 3 },
  legend: [
    { label: 'worker node', tone: 'blue' },
    { label: 'running pod', tone: 'green' },
    { label: 'control plane', tone: 'lavender' },
  ],
  learn: [
    { text: 'A Pod is the fundamental atomic unit of deployment in Kubernetes', step: 1 },
    { text: 'Nodes host the Kubelet and container runtime to run Pods', step: 2 },
    { text: 'Deployments manage ReplicaSets to ensure desired instance count', step: 3 },
    { text: 'Horizontal scaling spreads pods evenly across available nodes', step: 4 },
    { text: 'Self-healing: when a pod crashes, the ReplicaSet immediately replaces it', step: 5 },
  ],
  metrics: (s) => [
    { label: 'Nodes', value: String(s.nodes.length), icon: 'container' },
    { label: 'Deployments', value: String(s.deployments.length), icon: 'branch' },
    { label: 'Running Pods', value: String(s.pods.length), icon: 'activity', highlight: s.pods.length > 0 },
    { label: 'Desired Replicas', value: String(s.deployments.reduce((sum, d) => sum + d.replicas, 0)), icon: 'head' },
  ],
  steps: [
    {
      label: 'Concept',
      title: 'What is a Kubernetes Pod?',
      tag: 'CONCEPT',
      body: [
        'In Docker, the basic building block is a container. In Kubernetes, the smallest deployable unit is a **Pod**.',
        'A Pod wraps one or more containers sharing the same network namespace (localhost) and storage volumes.',
      ],
      keyIdea: 'Pods are ephemeral. You rarely create raw Pods directly; you manage them with Deployments.',
      actions: [],
    },
    {
      label: 'Nodes',
      title: 'The cluster workers',
      tag: 'CONCEPT',
      body: [
        'A Kubernetes cluster consists of a **Control Plane** (API server, scheduler, controller-manager) and multiple **Worker Nodes**.',
        'Here we have 3 worker nodes: `node-1`, `node-2`, and `node-3`, each running `kubelet` and a container runtime.',
      ],
      keyIdea: 'The kube-scheduler evaluates node capacity and assigns newly requested pods to the best node.',
      actions: [],
    },
    {
      label: 'Deploy',
      title: 'Creating a Deployment',
      tag: 'TECHNIQUE',
      body: [
        'A **Deployment** specifies the desired state: which container image to run and how many replicas should exist.',
        'We create a deployment `web-app` with 3 replicas. The scheduler places one replica on each worker node.',
      ],
      keyIdea: 'Deployments declare intent: Kubernetes continuously reconciles actual state to match desired state.',
      changes: [{ kind: 'add', text: 'Deployment web-app (3 replicas)' }],
      actions: [
        {
          cmd: 'kubectl create deployment web-app --image=nginx:1.27 --replicas=3',
          action: { type: 'createDeployment', name: 'web-app', image: 'nginx:1.27', replicas: 3 },
        },
      ],
    },
    {
      label: 'Scale',
      title: 'Scaling up to 5 replicas',
      tag: 'TECHNIQUE',
      body: [
        'Traffic increased! We scale the deployment to 5 replicas with `kubectl scale`.',
        'The ReplicaSet notices the count is below 5 and spawns 2 additional Pods, scheduling them across the cluster.',
      ],
      keyIdea: 'Declarative scaling happens without downtime.',
      changes: [{ kind: 'add', text: '2 new pods scheduled' }],
      actions: [
        {
          cmd: 'kubectl scale deployment web-app --replicas=5',
          action: { type: 'scale', name: 'web-app', replicas: 5 },
        },
      ],
    },
    {
      label: 'Heal',
      title: 'Self-healing in action',
      tag: 'TECHNIQUE',
      body: [
        'What happens when a node or container crashes? We simulate deleting a pod.',
        'The ReplicaSet reconciliation loop detects that only 4 pods exist when 5 are desired, and instantly launches a replacement pod.',
      ],
      keyIdea: 'Kubernetes actively maintains your desired replica count 24/7.',
      changes: [
        { kind: 'del', text: 'Pod terminated' },
        { kind: 'add', text: 'Replacement pod launched' },
      ],
      actions: [
        {
          cmd: 'kubectl delete pod (simulating pod crash)',
          action: { type: 'deletePod', name: 'web-app' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Key Takeaways',
      tag: 'RECAP',
      body: [
        'Pods run your application containers on worker nodes.',
        'Deployments and ReplicaSets provide declarative rollouts, scaling, and autonomous self-healing.',
      ],
      keyIdea: 'Never manage bare pods in production — always use Deployments.',
      actions: [],
    },
  ],
}

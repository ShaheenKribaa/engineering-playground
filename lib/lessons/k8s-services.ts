import { k8sSimulator, type K8sAction, type K8sEvent, type K8sState } from '@/lib/sim/k8s'
import type { Lesson } from './types'

export const k8sServicesLesson: Lesson<K8sState, K8sAction, K8sEvent> = {
  id: 'k8s-services',
  domainId: 'kubernetes',
  title: 'Services & Scheduling',
  subtitle: 'Expose pods with stable IP addresses, load balance traffic, and understand Service discovery.',
  minutes: 14,
  level: 'Intermediate',
  simulator: k8sSimulator,
  config: { nodes: 3 },
  legend: [
    { label: 'service proxy', tone: 'yellow' },
    { label: 'worker node', tone: 'blue' },
    { label: 'healthy pod', tone: 'green' },
  ],
  learn: [
    { text: 'Pods have ephemeral IP addresses that change when replaced', step: 1 },
    { text: 'A Service provides a permanent IP and DNS entry for a set of pods', step: 2 },
    { text: 'Label selectors dynamically link Services to matching Pods', step: 3 },
    { text: 'ClusterIP vs NodePort vs LoadBalancer service types', step: 4 },
    { text: 'Kube-proxy load balances incoming requests across backend endpoints', step: 5 },
  ],
  metrics: (s) => [
    { label: 'Services', value: String(s.services.length), icon: 'branch' },
    { label: 'Active Endpoints', value: String(s.pods.length), icon: 'container', highlight: s.pods.length > 0 },
    { label: 'Last Routed', value: s.trafficTarget ?? 'none', icon: 'head' },
  ],
  steps: [
    {
      label: 'Problem',
      title: 'Ephemeral Pod IPs',
      tag: 'CONCEPT',
      body: [
        'Each Pod gets its own IP address. However, because pods are frequently killed, scaled, or rescheduled, their IPs are completely volatile.',
        'If client applications connected directly to Pod IPs, every deployment or pod restart would break client connections.',
      ],
      keyIdea: 'Do not connect to pod IPs directly. You need a stable abstraction: a Kubernetes Service.',
      changes: [{ kind: 'add', text: 'Deployment api-backend (3 pods)' }],
      actions: [
        {
          cmd: 'kubectl create deployment api-backend --image=api:v1 --replicas=3',
          action: { type: 'createDeployment', name: 'api-backend', image: 'api:v1', replicas: 3 },
        },
      ],
    },
    {
      label: 'Service',
      title: 'Creating a ClusterIP Service',
      tag: 'TECHNIQUE',
      body: [
        'A **Service** provides a stable virtual IP (VIP) and DNS name inside the cluster. It routes traffic to pods matching a specific label selector.',
        'We create a `ClusterIP` service exposing port `80` which forwards traffic to target port `8080` on the pods.',
      ],
      keyIdea: 'A Service acts as an internal L4 load balancer for your pods.',
      changes: [{ kind: 'add', text: 'Service api-svc (port 80 -> 8080)' }],
      actions: [
        {
          cmd: 'kubectl expose deployment api-backend --name=api-svc --port=80 --target-port=8080 --type=ClusterIP',
          action: {
            type: 'createService',
            name: 'api-svc',
            type: 'ClusterIP',
            port: 80,
            targetPort: 8080,
            selector: { app: 'api-backend' },
          },
        },
      ],
    },
    {
      label: 'Traffic',
      title: 'Load balancing requests',
      tag: 'TECHNIQUE',
      body: [
        'When traffic hits `http://api-svc:80`, `kube-proxy` transparently distributes the request across healthy pod endpoints.',
        'Watch the yellow highlight indicate which pod received the traffic.',
      ],
      keyIdea: 'Requests are balanced across all healthy pods matching the service selector.',
      changes: [{ kind: 'mod', text: 'Request routed to pod endpoint' }],
      actions: [
        {
          cmd: 'curl http://api-svc:80/health',
          action: { type: 'sendTraffic', service: 'api-svc' },
        },
      ],
    },
    {
      label: 'Burst',
      title: 'Continuous traffic distribution',
      tag: 'TECHNIQUE',
      body: [
        'Sending additional requests routes them across different pods in the cluster.',
        'If any single pod crashes, the Service automatically removes it from the endpoint slice so clients never receive connection errors.',
      ],
      keyIdea: 'Endpoints update dynamically as pods come and go.',
      actions: [
        {
          cmd: 'curl http://api-svc:80/users',
          action: { type: 'sendTraffic', service: 'api-svc' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Summary',
      tag: 'RECAP',
      body: [
        'Use `ClusterIP` for internal microservice communication.',
        'Use `NodePort` or `LoadBalancer` (or Ingress) to expose services to external internet traffic.',
        'Labels and Selectors are the glue connecting Services to Pods.',
      ],
      keyIdea: 'Services provide the stable front doors for dynamic, ephemeral Pods.',
      actions: [],
    },
  ],
}

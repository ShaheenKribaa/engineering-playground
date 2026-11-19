import { dockerSimulator, type DockerAction, type DockerEvent, type DockerState } from '@/lib/sim/docker'
import type { Lesson } from './types'

export const dockerComposeLesson: Lesson<DockerState, DockerAction, DockerEvent> = {
  id: 'docker-compose',
  domainId: 'docker',
  title: 'Compose Multi-Service Apps',
  subtitle: 'Define, run, and scale multi-container stacks with shared networks and volumes.',
  minutes: 15,
  level: 'Intermediate',
  simulator: dockerSimulator,
  config: undefined,
  legend: [
    { label: 'service image', tone: 'yellow' },
    { label: 'running container', tone: 'green' },
    { label: 'compose network', tone: 'blue' },
    { label: 'named volume', tone: 'orange' },
  ],
  learn: [
    { text: 'Compose manages multi-container applications declaratively', step: 1 },
    { text: 'docker compose up spins up images, networks, and services together', step: 3 },
    { text: 'Automatic DNS service discovery links containers by name', step: 4 },
    { text: 'Named volumes persist database state across restarts', step: 5 },
    { text: 'docker compose up --scale scales stateless services instantly', step: 6 },
  ],
  metrics: (s) => [
    { label: 'Services/Images', value: String(s.images.length), icon: 'image' },
    {
      label: 'Containers',
      value: `${s.containers.filter((c) => c.status === 'running').length}/${s.containers.length}`,
      icon: 'container',
      highlight: true,
    },
    { label: 'Networks', value: String(s.networks.length), icon: 'network' },
    { label: 'Volumes', value: String(s.volumes.length), icon: 'volume' },
  ],
  steps: [
    {
      label: 'Concept',
      title: 'From single containers to microservices',
      tag: 'CONCEPT',
      body: [
        'Real-world applications rarely run in a single container. A modern web app often requires an API server, a Redis cache, and a PostgreSQL database.',
        'Starting and wiring them up with individual `docker run` commands is error-prone. Docker Compose allows you to define the whole stack in a single `compose.yaml` file.',
      ],
      keyIdea: 'Docker Compose translates a declarative YAML manifest into containers, networks, and volumes.',
      actions: [],
    },
    {
      label: 'Stack',
      title: 'The application stack',
      tag: 'TECHNIQUE',
      body: [
        'First, we pull the official images required for our stack: `node:20-alpine`, `redis:7-alpine`, and `postgres:16-alpine`.',
        'Notice how Docker reuses base layers across images when available.',
      ],
      keyIdea: 'Compose pulls missing images automatically before booting containers.',
      changes: [{ kind: 'add', text: '3 images: node, redis, postgres' }],
      actions: [
        {
          cmd: 'docker pull node:20-alpine',
          action: { type: 'pull', ref: 'node:20-alpine', layers: ['alpine-base', 'node-bin', 'npm-lib'] },
        },
        {
          cmd: 'docker pull redis:7-alpine',
          action: { type: 'pull', ref: 'redis:7-alpine', layers: ['alpine-base', 'redis-server'] },
        },
        {
          cmd: 'docker pull postgres:16-alpine',
          action: { type: 'pull', ref: 'postgres:16-alpine', layers: ['alpine-base', 'pg-bin', 'pg-data'] },
        },
      ],
    },
    {
      label: 'Up',
      title: 'docker compose up',
      tag: 'TECHNIQUE',
      body: [
        'Running `docker compose up -d` reads the configuration, creates an isolated bridge network `myapp_default`, mounts declared volumes, and launches all containers.',
        'Each container is assigned to the network, and the API container publishes port `3000:3000` to the host.',
      ],
      keyIdea: 'docker compose up boots the complete environment with unified lifecycle management.',
      changes: [
        { kind: 'add', text: 'Network: myapp_default' },
        { kind: 'add', text: 'Volume: pg_data' },
        { kind: 'add', text: 'Containers: web, redis, db' },
      ],
      actions: [
        {
          cmd: 'docker compose up -d',
          action: {
            type: 'composeUp',
            project: 'myapp',
            services: [
              { name: 'db', image: 'postgres:16-alpine', volume: { name: 'pg_data', path: '/var/lib/postgresql/data' } },
              { name: 'redis', image: 'redis:7-alpine' },
              { name: 'web', image: 'node:20-alpine', ports: ['3000:3000'], dependsOn: ['db', 'redis'] },
            ],
          },
        },
      ],
    },
    {
      label: 'Discovery',
      title: 'Service discovery & DNS',
      tag: 'CONCEPT',
      body: [
        'How does `web` reach `db` without knowing its IP address? Docker includes an embedded DNS server on user-defined networks.',
        'When `web` connects to `http://db:5432` or `redis:6379`, Docker automatically resolves the service name to the container IP.',
      ],
      keyIdea: 'Containers on the same user-defined network find each other by service name, eliminating hardcoded IPs.',
      actions: [],
    },
    {
      label: 'Data',
      title: 'Volume persistence in Compose',
      tag: 'TECHNIQUE',
      body: [
        'Database containers write state to `pg_data`. We simulate the database writing user records.',
        'Because the volume is managed at the Compose project level, database data persists even if the container crashes or is replaced.',
      ],
      keyIdea: 'Named volumes outlive container lifecycles.',
      changes: [{ kind: 'add', text: 'Data written to pg_data volume' }],
      actions: [
        {
          cmd: 'docker exec db psql -c "INSERT INTO users VALUES (1, \'alice\');"',
          action: { type: 'write', container: 'myapp-db-1', data: 'table:users (1 row)' },
        },
      ],
    },
    {
      label: 'Scale',
      title: 'Scaling stateless services',
      tag: 'TECHNIQUE',
      body: [
        'Traffic spikes! With stateless services like `web`, you can scale horizontally with a single command:',
        '`docker compose up --scale web=3` creates two additional web worker containers and attaches them to `myapp_default`.',
      ],
      keyIdea: 'Compose simplifies horizontal scaling for stateless application tiers.',
      changes: [{ kind: 'add', text: '2 new web replicas (web-2, web-3)' }],
      actions: [
        {
          cmd: 'docker compose up -d --scale web=3',
          action: { type: 'composeScale', project: 'myapp', service: 'web', replicas: 3 },
        },
      ],
    },
    {
      label: 'Down',
      title: 'Tearing down with docker compose down',
      tag: 'TECHNIQUE',
      body: [
        'When you finish testing or deploying, `docker compose down` gracefully stops and removes all containers and networks.',
        'Volumes are preserved by default to protect your data (unless `--volumes` is explicitly specified).',
      ],
      keyIdea: 'docker compose down provides a clean, predictable shutdown without leaving orphaned resources.',
      changes: [
        { kind: 'del', text: 'All 5 containers removed' },
        { kind: 'del', text: 'myapp_default network removed' },
      ],
      actions: [
        {
          cmd: 'docker compose down',
          action: { type: 'composeDown', project: 'myapp' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Summary',
      tag: 'RECAP',
      body: [
        'Compose standardizes development and production environments across teams.',
        'Use `compose.yaml` to declare services, networks, and persistent storage in version control alongside your source code.',
      ],
      keyIdea: 'One command to run them all: docker compose up -d.',
      actions: [],
    },
  ],
}

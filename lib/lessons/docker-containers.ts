import { dockerSimulator, type DockerAction, type DockerEvent, type DockerState } from '@/lib/sim/docker'
import type { Lesson } from './types'

const DEBIAN = 'FROM debian:bookworm-slim'

export const dockerContainersLesson: Lesson<DockerState, DockerAction, DockerEvent> = {
  id: 'docker-containers',
  domainId: 'docker',
  title: 'From Image to Container',
  subtitle: 'Build layered images, run containers from them, and wire up networks and volumes.',
  minutes: 14,
  level: 'Beginner',
  simulator: dockerSimulator,
  config: undefined,
  legend: [
    { label: 'image', tone: 'yellow' },
    { label: 'running', tone: 'green' },
    { label: 'network', tone: 'blue' },
    { label: 'volume', tone: 'orange' },
  ],
  learn: [
    { text: 'Images are read-only stacks of layers', step: 2 },
    { text: 'Why shared layers make builds fast', step: 3 },
    { text: 'One image, many containers', step: 5 },
    { text: 'Containers talk over user-defined networks', step: 6 },
    { text: 'Volumes outlive the containers that use them', step: 8 },
  ],
  metrics: (s) => [
    { label: 'Images', value: String(s.images.length), icon: 'image' },
    {
      label: 'Running',
      value: `${s.containers.filter((c) => c.status === 'running').length}/${s.containers.length}`,
      icon: 'container',
      highlight: true,
    },
    { label: 'Networks', value: String(s.networks.length), icon: 'network' },
    { label: 'Volumes', value: String(s.volumes.length), icon: 'volume' },
  ],
  steps: [
    {
      label: 'Problem',
      title: '“It works on my machine”',
      tag: 'CONCEPT',
      body: [
        'The `shop` API runs on your laptop but crashes on the server: different Node version, missing libraries, other config.',
        'Docker packages the app **together with its environment** so it runs the same everywhere. This box is your Docker host — it is empty for now.',
      ],
      keyIdea: 'A container is a process with its own isolated filesystem, network and limits — not a virtual machine.',
      actions: [],
    },
    {
      label: 'Pull',
      title: 'Pull an image',
      tag: 'TECHNIQUE',
      body: [
        'An **image** is a read-only template made of stacked layers. `docker pull` downloads one from a registry.',
        'Each layer is a filesystem diff identified by a hash. Layers are downloaded once and reused.',
      ],
      keyIdea: 'Images are immutable. You never “edit” an image — you build a new one.',
      changes: [{ kind: 'add', text: 'nginx:1.27 (3 layers)' }],
      actions: [
        {
          cmd: 'docker pull nginx:1.27',
          action: { type: 'pull', ref: 'nginx:1.27', layers: [DEBIAN, 'nginx binaries', 'default.conf'] },
        },
      ],
    },
    {
      label: 'Build',
      title: 'Build your own image',
      tag: 'TECHNIQUE',
      body: [
        'A `Dockerfile` lists steps; each step becomes a layer. `docker build` runs them in order.',
        'The base layer is already on disk from nginx, so it is **CACHED**. Put rarely-changing steps first to keep rebuilds fast.',
      ],
      keyIdea: 'Layer order matters: a change invalidates that layer and every layer after it.',
      changes: [
        { kind: 'add', text: 'shop-api:1.0 (5 layers)' },
        { kind: 'mod', text: 'Base layer reused from cache' },
      ],
      actions: [
        {
          cmd: 'docker build -t shop-api:1.0 .',
          action: {
            type: 'build',
            ref: 'shop-api:1.0',
            layers: [DEBIAN, 'RUN install node 22', 'COPY package*.json + npm ci', 'COPY ./src', 'CMD node server.js'],
          },
        },
      ],
    },
    {
      label: 'Run',
      title: 'Run a container',
      tag: 'TECHNIQUE',
      body: [
        '`docker run` adds a thin **writable layer** on top of the image and starts the process.',
        '`-p 8080:80` publishes the container’s port 80 on the host’s port 8080, so `localhost:8080` now reaches nginx.',
      ],
      keyIdea: 'Image is the class, container is the instance.',
      changes: [
        { kind: 'add', text: 'Container web (running)' },
        { kind: 'add', text: 'Port 8080 → 80' },
      ],
      actions: [
        {
          cmd: 'docker run -d --name web -p 8080:80 nginx:1.27',
          action: { type: 'run', name: 'web', image: 'nginx:1.27', ports: ['8080:80'] },
        },
      ],
    },
    {
      label: 'Scale',
      title: 'Many containers, one image',
      tag: 'CONCEPT',
      body: [
        'Traffic is growing, so you start two API containers from the same image.',
        'They share every read-only layer. Each gets only its own small writable layer, so the second container starts in milliseconds.',
      ],
      keyIdea: 'Containers are cheap because image layers are shared, not copied.',
      changes: [
        { kind: 'add', text: 'api-1 (running)' },
        { kind: 'add', text: 'api-2 (running)' },
      ],
      actions: [
        { cmd: 'docker run -d --name api-1 shop-api:1.0', action: { type: 'run', name: 'api-1', image: 'shop-api:1.0' } },
        { cmd: 'docker run -d --name api-2 shop-api:1.0', action: { type: 'run', name: 'api-2', image: 'shop-api:1.0' } },
      ],
    },
    {
      label: 'Network',
      title: 'Let containers talk',
      tag: 'TECHNIQUE',
      body: [
        'On the default bridge, containers can only reach each other by IP. A **user-defined network** adds built-in DNS.',
        'After connecting, `web` can proxy to `http://api-1:3000` by name.',
      ],
      keyIdea: 'Containers on the same user-defined network resolve each other by container name.',
      changes: [
        { kind: 'add', text: 'Network shop-net' },
        { kind: 'mod', text: 'web, api-1, api-2 connected' },
      ],
      actions: [
        { cmd: 'docker network create shop-net', action: { type: 'networkCreate', name: 'shop-net' } },
        { cmd: 'docker network connect shop-net web', action: { type: 'networkConnect', network: 'shop-net', container: 'web' } },
        { cmd: 'docker network connect shop-net api-1', action: { type: 'networkConnect', network: 'shop-net', container: 'api-1' } },
        { cmd: 'docker network connect shop-net api-2', action: { type: 'networkConnect', network: 'shop-net', container: 'api-2' } },
      ],
    },
    {
      label: 'Volume',
      title: 'Give the database a volume',
      tag: 'TECHNIQUE',
      body: [
        'The writable layer disappears with the container. That is fine for an API, fatal for a database.',
        'A **volume** is storage managed by Docker outside any container. Postgres writes its data there.',
      ],
      keyIdea: 'Keep state in volumes; keep containers disposable.',
      changes: [
        { kind: 'add', text: 'Volume pgdata' },
        { kind: 'add', text: 'postgres:17 (base layer cached)' },
        { kind: 'add', text: 'db writes orders table' },
      ],
      actions: [
        { cmd: 'docker volume create pgdata', action: { type: 'volumeCreate', name: 'pgdata' } },
        {
          cmd: 'docker pull postgres:17',
          action: { type: 'pull', ref: 'postgres:17', layers: [DEBIAN, 'postgres 17 binaries', 'docker-entrypoint.sh'] },
        },
        {
          cmd: 'docker run -d --name db --network shop-net -v pgdata:/var/lib/postgresql/data postgres:17',
          action: {
            type: 'run',
            name: 'db',
            image: 'postgres:17',
            network: 'shop-net',
            mount: { volume: 'pgdata', path: '/var/lib/postgresql/data' },
          },
        },
        { cmd: 'docker exec db psql -c "CREATE TABLE orders …"', action: { type: 'write', container: 'db', data: 'orders table' } },
      ],
    },
    {
      label: 'Replace',
      title: 'Destroy the container, keep the data',
      tag: 'CONCEPT',
      body: [
        'To upgrade, you delete `db` entirely and start a fresh one with the same volume.',
        'The container is gone, but `pgdata` still holds the orders table. The new `db` picks it up instantly.',
      ],
      keyIdea: 'Removing a container never removes its named volumes.',
      changes: [
        { kind: 'del', text: 'Container db removed' },
        { kind: 'mod', text: 'pgdata: data preserved' },
        { kind: 'add', text: 'New db attached to pgdata' },
      ],
      actions: [
        { cmd: 'docker rm -f db', action: { type: 'rm', name: 'db', force: true } },
        {
          cmd: 'docker run -d --name db --network shop-net -v pgdata:/var/lib/postgresql/data postgres:17',
          action: {
            type: 'run',
            name: 'db',
            image: 'postgres:17',
            network: 'shop-net',
            mount: { volume: 'pgdata', path: '/var/lib/postgresql/data' },
          },
        },
      ],
    },
    {
      label: 'Cleanup',
      title: 'Stop before you remove',
      tag: 'PITFALL',
      body: [
        'Traffic dropped, so you remove `api-2`. Docker refuses: it is still running. A failed command leaves everything exactly as it was.',
        'Stop it first (it gets `SIGTERM` and time to shut down cleanly), then remove it.',
      ],
      keyIdea: 'Prefer `docker stop` over `rm -f` so the process can finish in-flight requests.',
      changes: [
        { kind: 'mod', text: 'rm failed → state unchanged' },
        { kind: 'del', text: 'api-2 stopped and removed' },
      ],
      actions: [
        { cmd: 'docker rm api-2', action: { type: 'rm', name: 'api-2' } },
        { cmd: 'docker stop api-2', action: { type: 'stop', name: 'api-2' } },
        { cmd: 'docker rm api-2', action: { type: 'rm', name: 'api-2' } },
      ],
    },
    {
      label: 'Recap',
      title: 'What you learned',
      tag: 'RECAP',
      body: [
        'Images are immutable layer stacks; containers are disposable instances with a thin writable layer.',
        'Networks give containers names to find each other, and volumes keep state alive across container lifetimes. Next: describing all of this in one **Compose** file.',
      ],
      keyIdea: 'Treat containers like cattle, not pets — and keep the state somewhere safer.',
      actions: [],
    },
  ],
}

import { cicdSimulator, type CicdAction, type CicdEvent, type CicdState } from '@/lib/sim/cicd'
import type { Lesson } from './types'

export const cicdPipelinesLesson: Lesson<CicdState, CicdAction, CicdEvent> = {
  id: 'cicd-pipelines',
  domainId: 'cicd',
  title: 'Pipelines & Artifacts',
  subtitle: 'Automate code quality, run parallel test suites, build immutable container artifacts, and deploy to staging and production.',
  minutes: 15,
  level: 'Beginner',
  simulator: cicdSimulator,
  config: undefined,
  legend: [
    { label: 'stage pending', tone: 'lavender' },
    { label: 'stage running', tone: 'yellow' },
    { label: 'stage succeeded', tone: 'green' },
    { label: 'artifact / env', tone: 'blue' },
  ],
  learn: [
    { text: 'Continuous Integration validates code automatically on every git push', step: 1 },
    { text: 'Parallel jobs in lint and test stages fail fast on errors', step: 2 },
    { text: 'Build stages package software into immutable artifacts with content hashes', step: 4 },
    { text: 'Continuous Delivery automates promotions from Staging to Production', step: 5 },
    { text: 'Instant rollbacks revert traffic to the previous healthy artifact', step: 6 },
  ],
  metrics: (s) => [
    { label: 'Pipeline', value: s.pipelineId, icon: 'head' },
    { label: 'Branch', value: `${s.branch}@${s.commit}`, icon: 'branch' },
    { label: 'Artifacts', value: String(s.artifacts.length), icon: 'container' },
    { label: 'Environment', value: s.activeEnvironment, icon: 'activity', highlight: s.activeEnvironment !== 'none' },
  ],
  steps: [
    {
      label: 'Concept',
      title: 'Why automated CI/CD pipelines?',
      tag: 'CONCEPT',
      body: [
        'Manual testing and deployments are slow and error-prone. One forgotten build step can take down production.',
        '**Continuous Integration (CI)** tests and validates every pull request. **Continuous Delivery (CD)** automatically packages and deploys changes to environments.',
      ],
      keyIdea: 'Pipelines act as automated quality gates between development and production.',
      actions: [],
    },
    {
      label: 'Trigger',
      title: 'Triggering on git push',
      tag: 'TECHNIQUE',
      body: [
        'A developer pushes commit `9c4b2e1` to `main`. A webhook notifies GitHub Actions or GitLab CI, which allocates a runner and launches the pipeline.',
      ],
      keyIdea: 'Pipelines are triggered automatically by Git events (push, pull request, tag).',
      changes: [{ kind: 'add', text: 'Pipeline #204 triggered' }],
      actions: [
        {
          cmd: 'git push origin main (commit 9c4b2e1)',
          action: { type: 'trigger', branch: 'main', commit: '9c4b2e1' },
        },
      ],
    },
    {
      label: 'Validate',
      title: 'Stage 1: Lint & Validate',
      tag: 'TECHNIQUE',
      body: [
        'The runner executes `pnpm lint` and `pnpm tsc --noEmit` in parallel.',
        'If any syntax error or type mismatch is found, the pipeline fails immediately before running expensive tests.',
      ],
      keyIdea: 'Fail fast: run lightweight linters before heavier test suites.',
      changes: [{ kind: 'mod', text: 'Lint & Typecheck passed' }],
      actions: [
        {
          cmd: 'run stage: lint & validate',
          action: { type: 'runStage', stageId: 'lint' },
        },
      ],
    },
    {
      label: 'Tests',
      title: 'Stage 2: Automated Tests',
      tag: 'TECHNIQUE',
      body: [
        'Next, unit tests and end-to-end integration tests run in parallel test matrix containers.',
        'All 42 unit test assertions and 6 Playwright browser flows pass.',
      ],
      keyIdea: 'Automated test suites ensure regressions never reach production.',
      changes: [{ kind: 'mod', text: 'Unit & E2E tests passed' }],
      actions: [
        {
          cmd: 'run stage: automated tests',
          action: { type: 'runStage', stageId: 'test' },
        },
      ],
    },
    {
      label: 'Package',
      title: 'Stage 3: Build & Package Artifact',
      tag: 'TECHNIQUE',
      body: [
        'With tests green, the build stage creates an immutable OCI container image tagged with the commit SHA.',
        'Notice the container artifact `registry.io/app:9c4b2e1` appears in the artifacts drawer.',
      ],
      keyIdea: 'Build once, deploy many times: the same artifact is promoted across all environments.',
      changes: [{ kind: 'add', text: 'Artifact: registry.io/app:9c4b2e1' }],
      actions: [
        {
          cmd: 'docker build -t registry.io/app:9c4b2e1 .',
          action: { type: 'runStage', stageId: 'build' },
        },
      ],
    },
    {
      label: 'Staging',
      title: 'Stage 4: Deploy to Staging',
      tag: 'TECHNIQUE',
      body: [
        'The pipeline deploys the new image to the `staging` environment for smoke testing and QA review.',
        'Environment target updates to `STAGING`.',
      ],
      keyIdea: 'Staging mirrors production to catch configuration mismatches early.',
      changes: [{ kind: 'mod', text: 'Live on STAGING' }],
      actions: [
        {
          cmd: 'kubectl apply -k ./envs/staging',
          action: { type: 'deploy', environment: 'staging' },
        },
      ],
    },
    {
      label: 'Production',
      title: 'Promotion to Production',
      tag: 'TECHNIQUE',
      body: [
        'After QA approval, the exact same verified artifact is promoted to `production`.',
        'Zero-downtime rolling update replaces older pods with the new version.',
      ],
      keyIdea: 'Never rebuild for production — promote the pre-tested artifact.',
      changes: [{ kind: 'mod', text: 'Live on PRODUCTION' }],
      actions: [
        {
          cmd: 'kubectl apply -k ./envs/production',
          action: { type: 'deploy', environment: 'production' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Summary',
      tag: 'RECAP',
      body: [
        'CI validates every commit with linting and automated tests.',
        'CD packages validated code into immutable artifacts and promotes them across environments.',
      ],
      keyIdea: 'Automate everything from git push to production release.',
      actions: [],
    },
  ],
}

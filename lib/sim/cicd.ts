import { fail, ok, type SimulationResult, type Simulator } from './types'

export type JobStatus = 'pending' | 'running' | 'success' | 'failed'

export interface PipelineJob {
  id: string
  name: string
  command: string
  status: JobStatus
  duration: string
}

export interface PipelineStage {
  id: string
  name: string
  status: JobStatus
  jobs: PipelineJob[]
}

export interface PipelineArtifact {
  name: string
  size: string
  hash: string
}

export interface CicdState {
  pipelineId: string
  branch: string
  commit: string
  status: JobStatus
  stages: PipelineStage[]
  artifacts: PipelineArtifact[]
  activeEnvironment: string
}

export type CicdAction =
  | { type: 'trigger'; branch: string; commit: string }
  | { type: 'runStage'; stageId: string }
  | { type: 'deploy'; environment: 'staging' | 'production' }
  | { type: 'rollback'; environment: 'staging' | 'production' }

export type CicdEvent =
  | { type: 'PIPELINE_TRIGGERED'; id: string; branch: string }
  | { type: 'STAGE_STARTED'; stageId: string }
  | { type: 'STAGE_COMPLETED'; stageId: string; status: JobStatus }
  | { type: 'ARTIFACT_CREATED'; name: string }
  | { type: 'DEPLOYED'; environment: string }

type Result = SimulationResult<CicdState, CicdEvent>

export const cicdSimulator: Simulator<CicdState, CicdAction, CicdEvent, void> = {
  id: 'cicd',
  version: '1.0.0',

  initialize() {
    return {
      pipelineId: '#101',
      branch: 'main',
      commit: '7a2f1c8',
      status: 'pending',
      activeEnvironment: 'none',
      artifacts: [],
      stages: [
        {
          id: 'lint',
          name: '1. Lint & Validate',
          status: 'pending',
          jobs: [
            { id: 'eslint', name: 'ESLint', command: 'pnpm lint', status: 'pending', duration: '12s' },
            { id: 'tsc', name: 'TypeScript Check', command: 'pnpm tsc --noEmit', status: 'pending', duration: '18s' },
          ],
        },
        {
          id: 'test',
          name: '2. Automated Tests',
          status: 'pending',
          jobs: [
            { id: 'unit', name: 'Unit Tests (Vitest)', command: 'pnpm test:unit', status: 'pending', duration: '34s' },
            { id: 'e2e', name: 'E2E Tests (Playwright)', command: 'pnpm test:e2e', status: 'pending', duration: '52s' },
          ],
        },
        {
          id: 'build',
          name: '3. Build & Package',
          status: 'pending',
          jobs: [
            { id: 'docker-build', name: 'Container Image', command: 'docker build -t app:7a2f1c8 .', status: 'pending', duration: '45s' },
          ],
        },
        {
          id: 'deploy',
          name: '4. Continuous Deployment',
          status: 'pending',
          jobs: [
            { id: 'k8s-deploy', name: 'Deploy Manifests', command: 'kubectl apply -k ./k8s/envs/staging', status: 'pending', duration: '15s' },
          ],
        },
      ],
    }
  },

  execute(state, action): Result {
    switch (action.type) {
      case 'trigger': {
        const next = cicdSimulator.initialize()
        return ok(
          {
            ...next,
            pipelineId: `#${Math.floor(Math.random() * 800) + 100}`,
            branch: action.branch,
            commit: action.commit,
            status: 'running',
          },
          [{ type: 'PIPELINE_TRIGGERED', id: next.pipelineId, branch: action.branch }],
          `Pipeline ${next.pipelineId} triggered by git push to ${action.branch} (${action.commit}).`,
        )
      }

      case 'runStage': {
        const stageIndex = state.stages.findIndex((s) => s.id === action.stageId)
        if (stageIndex === -1) return fail(state, 'NOT_FOUND', `Stage '${action.stageId}' not found`)

        const nextStages = state.stages.map((stage, idx) => {
          if (idx === stageIndex) {
            return {
              ...stage,
              status: 'success' as JobStatus,
              jobs: stage.jobs.map((j) => ({ ...j, status: 'success' as JobStatus })),
            }
          }
          return stage
        })

        const events: CicdEvent[] = [
          { type: 'STAGE_STARTED', stageId: action.stageId },
          { type: 'STAGE_COMPLETED', stageId: action.stageId, status: 'success' },
        ]

        let nextArtifacts = [...state.artifacts]
        if (action.stageId === 'build') {
          const art: PipelineArtifact = {
            name: `registry.io/app:${state.commit}`,
            size: '142 MB',
            hash: 'sha256:4a8b...19c',
          }
          nextArtifacts.push(art)
          events.push({ type: 'ARTIFACT_CREATED', name: art.name })
        }

        const allPassed = nextStages.every((s) => s.status === 'success')

        return ok(
          {
            ...state,
            stages: nextStages,
            artifacts: nextArtifacts,
            status: allPassed ? 'success' : 'running',
          },
          events,
          `Stage '${nextStages[stageIndex].name}' succeeded (${nextStages[stageIndex].jobs.length} jobs passed).`,
        )
      }

      case 'deploy': {
        const buildStage = state.stages.find((s) => s.id === 'build')
        if (buildStage?.status !== 'success') {
          return fail(state, 'NO_ARTIFACT', 'Cannot deploy: build stage must produce a validated artifact first.')
        }

        const nextStages = state.stages.map((s) =>
          s.id === 'deploy' ? { ...s, status: 'success' as JobStatus, jobs: s.jobs.map((j) => ({ ...j, status: 'success' as JobStatus })) } : s,
        )

        return ok(
          {
            ...state,
            stages: nextStages,
            activeEnvironment: action.environment,
            status: 'success',
          },
          [{ type: 'DEPLOYED', environment: action.environment }],
          `Successfully deployed immutable artifact ${state.commit} to environment: [${action.environment.toUpperCase()}].`,
        )
      }

      case 'rollback': {
        return ok(
          {
            ...state,
            activeEnvironment: `${action.environment} (reverted to prev stable)`,
          },
          [{ type: 'DEPLOYED', environment: `${action.environment}-rollback` }],
          `Instant rollback initiated on [${action.environment.toUpperCase()}]: traffic restored to previous healthy artifact.`,
        )
      }
    }
  },
}

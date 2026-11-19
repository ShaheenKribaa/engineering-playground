import { fail, ok, shortHash, type SimulationResult, type Simulator } from './types'

export interface GitCommit {
  id: string
  message: string
  parents: string[]
  seq: number
  lane: number
  /** File path → new content introduced by this commit. */
  changes: Record<string, string>
}

export interface GitBranch {
  name: string
  head: string | null
  lane: number
}

export interface GitConflict {
  file: string
  ours: string
  theirs: string
  resolved?: string
}

export interface GitMerge {
  branch: string
  theirs: string
  conflicts: GitConflict[]
}

export interface GitState {
  initialized: boolean
  commits: Record<string, GitCommit>
  order: string[]
  branches: Record<string, GitBranch>
  currentBranch: string | null
  nextLane: number
  merging: GitMerge | null
  stash?: { message: string; changes: Record<string, string> }[]
}

export type ResolveStrategy = 'ours' | 'theirs' | 'both'

export type GitAction =
  | { type: 'init' }
  | { type: 'commit'; message: string; changes?: Record<string, string>; amend?: boolean }
  | { type: 'branch'; name: string }
  | { type: 'switch'; name: string; create?: boolean }
  | { type: 'merge'; name: string }
  | { type: 'mergeAbort' }
  | { type: 'resolve'; file: string; strategy: ResolveStrategy; content?: string }
  | { type: 'rebase'; onto: string }
  | { type: 'cherryPick'; target: string }
  | { type: 'reset'; target: string; mode?: 'soft' | 'hard' }
  | { type: 'revert'; target: string }
  | { type: 'stash'; pop?: boolean; message?: string }
  | { type: 'log' }
  | { type: 'status' }

export type GitEvent =
  | { type: 'REPO_INITIALIZED' }
  | { type: 'COMMIT_CREATED'; id: string; branch: string }
  | { type: 'BRANCH_CREATED'; name: string; at: string | null }
  | { type: 'HEAD_MOVED'; to: string }
  | { type: 'FAST_FORWARD'; branch: string; from: string | null; to: string }
  | { type: 'MERGE_COMMIT'; id: string; merged: string }
  | { type: 'MERGE_CONFLICT'; files: string[] }
  | { type: 'CONFLICT_RESOLVED'; file: string }
  | { type: 'REBASED'; branch: string; replayed: { from: string; to: string }[] }
  | { type: 'AMENDED'; from: string; to: string }
  | { type: 'CHERRY_PICKED'; from: string; to: string }
  | { type: 'RESET'; to: string; mode: string }
  | { type: 'REVERTED'; from: string; to: string }
  | { type: 'STASHED'; count: number }
  | { type: 'STASH_POPPED' }

type Result = SimulationResult<GitState, GitEvent>

export function isAncestor(state: GitState, ancestor: string, of: string): boolean {
  return ancestorsOf(state, of).has(ancestor)
}

export function ancestorsOf(state: GitState, id: string | null): Set<string> {
  const seen = new Set<string>()
  if (!id) return seen
  const stack = [id]
  while (stack.length) {
    const next = stack.pop()!
    if (seen.has(next)) continue
    seen.add(next)
    stack.push(...(state.commits[next]?.parents ?? []))
  }
  return seen
}

/** Commits reachable from any branch head. Anything else is dangling (e.g. replaced by rebase or amend). */
export function reachableCommits(state: GitState): Set<string> {
  const all = new Set<string>()
  for (const b of Object.values(state.branches)) for (const id of ancestorsOf(state, b.head)) all.add(id)
  return all
}

function mergeBase(state: GitState, a: string, b: string): string | null {
  const ofA = ancestorsOf(state, a)
  let best: string | null = null
  for (const id of ancestorsOf(state, b)) {
    if (ofA.has(id) && (!best || state.commits[id].seq > state.commits[best].seq)) best = id
  }
  return best
}

/** Final content of each file changed between base (exclusive) and head (inclusive). */
function sideChanges(state: GitState, head: string, base: string | null): Record<string, string> {
  const excluded = ancestorsOf(state, base)
  const commits = [...ancestorsOf(state, head)]
    .filter((id) => !excluded.has(id))
    .map((id) => state.commits[id])
    .sort((x, y) => x.seq - y.seq)
  const out: Record<string, string> = {}
  for (const c of commits) Object.assign(out, c.changes)
  return out
}

function nextSeq(state: GitState) {
  return state.order.length
}

function addCommit(
  state: GitState,
  message: string,
  parents: string[],
  changes: Record<string, string>,
  branchName = state.currentBranch!,
): [GitState, GitCommit] {
  const branch = state.branches[branchName]
  const seq = nextSeq(state)
  const commit: GitCommit = {
    id: shortHash(`${seq}:${message}:${parents.join(',')}:${JSON.stringify(changes)}`),
    message,
    parents,
    seq,
    lane: branch.lane,
    changes,
  }
  const next: GitState = {
    ...state,
    commits: { ...state.commits, [commit.id]: commit },
    order: [...state.order, commit.id],
    branches: { ...state.branches, [branch.name]: { ...branch, head: commit.id } },
  }
  return [next, commit]
}

function requireRepo(state: GitState): Result | null {
  if (!state.initialized) {
    return fail(state, 'NOT_A_REPO', 'fatal: not a git repository (run `git init` first)')
  }
  return null
}

function requireNoMerge(state: GitState, verb: string): Result | null {
  if (state.merging) {
    return fail(
      state,
      'MERGE_IN_PROGRESS',
      `error: ${verb} is not possible because you have unmerged files.\nhint: Fix them up, then \`git commit\`, or run \`git merge --abort\`.`,
    )
  }
  return null
}

function combine(ours: string, theirs: string) {
  return ours === theirs ? ours : `${ours}  +  ${theirs}`
}

export const gitSimulator: Simulator<GitState, GitAction, GitEvent, void> = {
  id: 'git',
  version: '1.1.0',

  initialize() {
    return {
      initialized: false,
      commits: {},
      order: [],
      branches: {},
      currentBranch: null,
      nextLane: 0,
      merging: null,
    }
  },

  execute(state, action): Result {
    switch (action.type) {
      case 'init': {
        if (state.initialized) return ok(state, [], 'Reinitialized existing Git repository')
        return ok(
          {
            ...state,
            initialized: true,
            branches: { main: { name: 'main', head: null, lane: 0 } },
            currentBranch: 'main',
            nextLane: 1,
          },
          [{ type: 'REPO_INITIALIZED' }],
          'Initialized empty Git repository in /shop/.git/',
        )
      }

      case 'commit': {
        const guard = requireRepo(state)
        if (guard) return guard
        const branch = state.branches[state.currentBranch!]

        if (state.merging) {
          const open = state.merging.conflicts.filter((c) => c.resolved === undefined)
          if (open.length) {
            return fail(
              state,
              'UNMERGED_FILES',
              `error: Committing is not possible because you have unmerged files.\n${open
                .map((c) => `U  ${c.file}`)
                .join('\n')}\nhint: resolve them, then \`git add <file>\`.`,
            )
          }
          const resolutions = Object.fromEntries(state.merging.conflicts.map((c) => [c.file, c.resolved!]))
          const [next, commit] = addCommit(
            { ...state, merging: null },
            action.message,
            [branch.head!, state.merging.theirs],
            resolutions,
          )
          return ok(
            next,
            [{ type: 'MERGE_COMMIT', id: commit.id, merged: state.merging.branch }],
            `[${branch.name} ${commit.id}] ${action.message}`,
          )
        }

        if (action.amend) {
          if (!branch.head) return fail(state, 'NOTHING_TO_AMEND', 'fatal: You have nothing to amend.')
          const old = state.commits[branch.head]
          const [next, commit] = addCommit(state, action.message, old.parents, { ...old.changes, ...action.changes })
          return ok(
            next,
            [{ type: 'AMENDED', from: old.id, to: commit.id }],
            `[${branch.name} ${commit.id}] ${action.message}\n(${old.id} is no longer on any branch)`,
          )
        }

        const [next, commit] = addCommit(state, action.message, branch.head ? [branch.head] : [], action.changes ?? {})
        const files = Object.keys(commit.changes)
        return ok(
          next,
          [{ type: 'COMMIT_CREATED', id: commit.id, branch: branch.name }],
          `[${branch.name}${branch.head ? '' : ' (root-commit)'} ${commit.id}] ${action.message}${
            files.length ? `\n ${files.length} file${files.length === 1 ? '' : 's'} changed: ${files.join(', ')}` : ''
          }`,
        )
      }

      case 'branch': {
        const guard = requireRepo(state)
        if (guard) return guard
        if (state.branches[action.name]) {
          return fail(state, 'BRANCH_EXISTS', `fatal: a branch named '${action.name}' already exists`)
        }
        const head = state.branches[state.currentBranch!].head
        if (!head) {
          return fail(state, 'UNBORN_BRANCH', `fatal: not a valid object name: '${state.currentBranch}'`)
        }
        return ok(
          {
            ...state,
            branches: { ...state.branches, [action.name]: { name: action.name, head, lane: state.nextLane } },
            nextLane: state.nextLane + 1,
          },
          [{ type: 'BRANCH_CREATED', name: action.name, at: head }],
          `Created branch '${action.name}' at ${head}`,
        )
      }

      case 'switch': {
        const guard = requireRepo(state) ?? requireNoMerge(state, 'Switching branches')
        if (guard) return guard
        let working = state
        const events: GitEvent[] = []
        if (action.create) {
          const created = gitSimulator.execute(state, { type: 'branch', name: action.name })
          if (created.status === 'failure') return created
          working = created.nextState
          events.push(...created.events)
        } else if (!state.branches[action.name]) {
          return fail(state, 'BRANCH_NOT_FOUND', `fatal: invalid reference: ${action.name}`)
        }
        if (working.currentBranch === action.name) {
          return ok(working, events, `Already on '${action.name}'`)
        }
        events.push({ type: 'HEAD_MOVED', to: action.name })
        return ok(
          { ...working, currentBranch: action.name },
          events,
          action.create ? `Switched to a new branch '${action.name}'` : `Switched to branch '${action.name}'`,
        )
      }

      case 'merge': {
        const guard = requireRepo(state) ?? requireNoMerge(state, 'Merging')
        if (guard) return guard
        const target = state.branches[action.name]
        if (!target) return fail(state, 'BRANCH_NOT_FOUND', `merge: ${action.name} - not something we can merge`)
        const current = state.branches[state.currentBranch!]
        if (target.name === current.name) {
          return fail(state, 'MERGE_SELF', 'fatal: refusing to merge a branch into itself')
        }
        if (!target.head) return fail(state, 'UNBORN_BRANCH', `fatal: '${action.name}' has no commits`)
        if (current.head && isAncestor(state, target.head, current.head)) {
          return ok(state, [], 'Already up to date.')
        }
        if (!current.head || isAncestor(state, current.head, target.head)) {
          return ok(
            {
              ...state,
              branches: { ...state.branches, [current.name]: { ...current, head: target.head } },
            },
            [{ type: 'FAST_FORWARD', branch: current.name, from: current.head, to: target.head }],
            `Updating ${current.head ?? '0000000'}..${target.head}\nFast-forward`,
          )
        }

        const base = mergeBase(state, current.head, target.head)
        const ours = sideChanges(state, current.head, base)
        const theirs = sideChanges(state, target.head, base)
        const conflicts: GitConflict[] = Object.keys(theirs)
          .filter((f) => f in ours && ours[f] !== theirs[f])
          .map((file) => ({ file, ours: ours[file], theirs: theirs[file] }))

        if (conflicts.length) {
          return ok(
            { ...state, merging: { branch: target.name, theirs: target.head, conflicts } },
            [{ type: 'MERGE_CONFLICT', files: conflicts.map((c) => c.file) }],
            `${conflicts.map((c) => `CONFLICT (content): Merge conflict in ${c.file}`).join('\n')}\nAutomatic merge failed; fix conflicts and then commit the result.`,
          )
        }

        const [next, commit] = addCommit(state, `Merge branch '${target.name}'`, [current.head, target.head], {})
        return ok(
          next,
          [{ type: 'MERGE_COMMIT', id: commit.id, merged: target.name }],
          `Merge made by the 'ort' strategy.\n[${current.name} ${commit.id}] Merge branch '${target.name}'`,
        )
      }

      case 'mergeAbort': {
        if (!state.merging) return fail(state, 'NO_MERGE', 'fatal: There is no merge to abort (MERGE_HEAD missing).')
        return ok({ ...state, merging: null }, [], 'Merge aborted. Working tree restored to HEAD.')
      }

      case 'resolve': {
        const merging = state.merging
        if (!merging) return fail(state, 'NO_MERGE', `No merge in progress — nothing to resolve for ${action.file}`)
        const conflict = merging.conflicts.find((c) => c.file === action.file)
        if (!conflict) return fail(state, 'NOT_CONFLICTED', `fatal: '${action.file}' is not in conflict`)
        const resolved =
          action.content ??
          (action.strategy === 'ours'
            ? conflict.ours
            : action.strategy === 'theirs'
              ? conflict.theirs
              : combine(conflict.ours, conflict.theirs))
        const conflicts = merging.conflicts.map((c) => (c.file === action.file ? { ...c, resolved } : c))
        const remaining = conflicts.filter((c) => c.resolved === undefined).length
        return ok(
          { ...state, merging: { ...merging, conflicts } },
          [{ type: 'CONFLICT_RESOLVED', file: action.file }],
          `${action.file} marked as resolved → "${resolved}"${
            remaining ? `\n${remaining} conflict${remaining === 1 ? '' : 's'} remaining` : '\nAll conflicts fixed — run `git commit` to conclude the merge.'
          }`,
        )
      }

      case 'rebase': {
        const guard = requireRepo(state) ?? requireNoMerge(state, 'Rebasing')
        if (guard) return guard
        const onto = state.branches[action.onto]
        if (!onto?.head) return fail(state, 'BRANCH_NOT_FOUND', `fatal: invalid upstream '${action.onto}'`)
        const current = state.branches[state.currentBranch!]
        if (!current.head) return fail(state, 'UNBORN_BRANCH', 'fatal: no commits to rebase')
        if (onto.name === current.name) return ok(state, [], `Current branch ${current.name} is up to date.`)
        if (isAncestor(state, onto.head, current.head)) {
          return ok(state, [], `Current branch ${current.name} is up to date.`)
        }
        const upstream = ancestorsOf(state, onto.head)
        const toReplay = [...ancestorsOf(state, current.head)]
          .filter((id) => !upstream.has(id))
          .map((id) => state.commits[id])
          .filter((c) => c.parents.length < 2)
          .sort((a, b) => a.seq - b.seq)

        let working = state
        let parent = onto.head
        const replayed: { from: string; to: string }[] = []
        for (const c of toReplay) {
          const [next, created] = addCommit(working, c.message, [parent], c.changes, current.name)
          working = next
          parent = created.id
          replayed.push({ from: c.id, to: created.id })
        }
        if (!replayed.length) {
          working = {
            ...working,
            branches: { ...working.branches, [current.name]: { ...current, head: onto.head } },
          }
        }
        return ok(
          working,
          [{ type: 'REBASED', branch: current.name, replayed }],
          `${replayed.map((r, i) => `Applying (${i + 1}/${replayed.length}): ${r.from} → ${r.to}`).join('\n')}\nSuccessfully rebased and updated refs/heads/${current.name}.`,
        )
      }

      case 'log': {
        const guard = requireRepo(state)
        if (guard) return guard
        const head = state.branches[state.currentBranch!].head
        if (!head) return fail(state, 'UNBORN_BRANCH', `fatal: your current branch '${state.currentBranch}' does not have any commits yet`)
        const lines: string[] = []
        const seen = new Set<string>()
        const queue = [head]
        while (queue.length && lines.length < 8) {
          queue.sort((a, b) => state.commits[b].seq - state.commits[a].seq)
          const id = queue.shift()!
          if (seen.has(id)) continue
          seen.add(id)
          lines.push(`${id} ${state.commits[id].message}`)
          queue.push(...state.commits[id].parents)
        }
        return ok(state, [], lines.join('\n'))
      }

      case 'status': {
        const guard = requireRepo(state)
        if (guard) return guard
        if (state.merging) {
          const lines = state.merging.conflicts.map((c) =>
            c.resolved === undefined ? `  both modified:   ${c.file}` : `  resolved:        ${c.file}`,
          )
          return ok(
            state,
            [],
            `On branch ${state.currentBranch}\nYou have unmerged paths (merging '${state.merging.branch}').\n${lines.join('\n')}`,
          )
        }
        return ok(state, [], `On branch ${state.currentBranch}\nnothing to commit, working tree clean`)
      }

      case 'cherryPick': {
        const guard = requireRepo(state) ?? requireNoMerge(state, 'Cherry-picking')
        if (guard) return guard
        const current = state.branches[state.currentBranch!]
        let targetId: string | null = null
        if (state.commits[action.target]) targetId = action.target
        else if (state.branches[action.target]?.head) targetId = state.branches[action.target].head
        else {
          const match = Object.keys(state.commits).find((id) => id.startsWith(action.target))
          if (match) targetId = match
        }
        if (!targetId || !state.commits[targetId]) {
          return fail(state, 'BAD_REVISION', `fatal: bad revision '${action.target}'`)
        }
        const source = state.commits[targetId]
        const parent = current.head ? [current.head] : []
        const [next, commit] = addCommit(state, source.message, parent, source.changes, current.name)
        return ok(
          next,
          [{ type: 'CHERRY_PICKED', from: targetId, to: commit.id }],
          `[${current.name} ${commit.id}] ${source.message}\n(cherry-picked from commit ${targetId})`,
        )
      }

      case 'reset': {
        const guard = requireRepo(state)
        if (guard) return guard
        const current = state.branches[state.currentBranch!]
        let targetId: string | null = null
        const target = action.target.trim()
        if (target === 'HEAD~1' || target === 'HEAD^') {
          if (!current.head) return fail(state, 'NO_PARENT', 'fatal: HEAD has no parent')
          targetId = state.commits[current.head]?.parents[0] ?? null
        } else if (state.commits[target]) {
          targetId = target
        } else if (state.branches[target]?.head) {
          targetId = state.branches[target].head
        } else {
          const match = Object.keys(state.commits).find((id) => id.startsWith(target))
          if (match) targetId = match
        }
        if (!targetId) {
          return fail(state, 'BAD_TARGET', `fatal: Cannot do reset to '${action.target}'.`)
        }
        const nextBranches = {
          ...state.branches,
          [current.name]: { ...current, head: targetId },
        }
        return ok(
          { ...state, branches: nextBranches, merging: null },
          [{ type: 'RESET', to: targetId, mode: action.mode ?? 'hard' }],
          `HEAD is now at ${targetId} ${state.commits[targetId]?.message ?? ''}`,
        )
      }

      case 'revert': {
        const guard = requireRepo(state) ?? requireNoMerge(state, 'Reverting')
        if (guard) return guard
        const current = state.branches[state.currentBranch!]
        let targetId: string | null = null
        if (state.commits[action.target]) targetId = action.target
        else if (state.branches[action.target]?.head) targetId = state.branches[action.target].head
        else {
          const match = Object.keys(state.commits).find((id) => id.startsWith(action.target))
          if (match) targetId = match
        }
        if (!targetId || !state.commits[targetId]) {
          return fail(state, 'BAD_REVISION', `fatal: bad revision '${action.target}'`)
        }
        const source = state.commits[targetId]
        const parent = current.head ? [current.head] : []
        const revertChanges = Object.fromEntries(Object.keys(source.changes).map((k) => [k, 'reverted']))
        const [next, commit] = addCommit(state, `Revert "${source.message}"`, parent, revertChanges, current.name)
        return ok(
          next,
          [{ type: 'REVERTED', from: targetId, to: commit.id }],
          `[${current.name} ${commit.id}] Revert "${source.message}"`,
        )
      }

      case 'stash': {
        const guard = requireRepo(state)
        if (guard) return guard
        const currentStash = state.stash ?? []
        if (action.pop) {
          if (!currentStash.length) {
            return fail(state, 'NO_STASH', 'error: No stash entries found.')
          }
          const popped = currentStash[0]
          return ok(
            { ...state, stash: currentStash.slice(1) },
            [{ type: 'STASH_POPPED' }],
            `Dropped refs/stash@{0} (${popped.message})\nApplied stashed changes.`,
          )
        }
        const entry = { message: action.message ?? 'WIP on ' + (state.currentBranch ?? 'HEAD'), changes: {} }
        const nextStash = [entry, ...currentStash]
        return ok(
          { ...state, stash: nextStash },
          [{ type: 'STASHED', count: nextStash.length }],
          `Saved working directory and index state "${entry.message}"`,
        )
      }
    }
  },
}

export function parseGitCommand(input: string): GitAction | { error: string } {
  const tokens = input.match(/[^\s"']+="[^"]*"|[^\s"']+='[^']*'|"[^"]*"|'[^']*'|\S+/g) ?? []
  const clean = (t: string) => t.replace(/^["']|["']$/g, '')
  if (tokens[0] !== 'git') return { error: `command not found: ${tokens[0] ?? ''}. Try \`git help\`.` }
  const [, cmd, ...raw] = tokens
  const rest = raw.map(clean)
  switch (cmd) {
    case 'init':
      return { type: 'init' }
    case 'commit': {
      const m = rest.findIndex((t) => t === '-m' || t === '-am')
      if (m === -1 || !rest[m + 1]) return { error: 'usage: git commit -m "message" [file=content ...] [--amend]' }
      const changes: Record<string, string> = {}
      raw.slice(m + 2).forEach((t) => {
        const eq = t.indexOf('=')
        if (eq > 0 && !t.startsWith('-')) changes[t.slice(0, eq)] = clean(t.slice(eq + 1))
      })
      return { type: 'commit', message: rest[m + 1], changes, amend: rest.includes('--amend') }
    }
    case 'branch':
      if (!rest[0]) return { error: 'usage: git branch <name>' }
      return { type: 'branch', name: rest[0] }
    case 'switch':
    case 'checkout': {
      const strategy = rest.includes('--ours') ? 'ours' : rest.includes('--theirs') ? 'theirs' : null
      if (strategy) {
        const file = rest.find((t) => !t.startsWith('-'))
        if (!file) return { error: `usage: git checkout --${strategy} <file>` }
        return { type: 'resolve', file, strategy }
      }
      const create = rest.includes('-c') || rest.includes('-b')
      const name = rest.find((t) => !t.startsWith('-'))
      if (!name) return { error: `usage: git ${cmd} [-${cmd === 'switch' ? 'c' : 'b'}] <branch>` }
      return { type: 'switch', name, create }
    }
    case 'add':
      if (!rest[0]) return { error: 'usage: git add <file>  (marks a conflicted file resolved, keeping both sides)' }
      return { type: 'resolve', file: rest[0], strategy: 'both' }
    case 'merge':
      if (rest[0] === '--abort') return { type: 'mergeAbort' }
      if (!rest[0]) return { error: 'usage: git merge <branch> | git merge --abort' }
      return { type: 'merge', name: rest[0] }
    case 'rebase':
      if (!rest[0]) return { error: 'usage: git rebase <upstream>' }
      return { type: 'rebase', onto: rest[0] }
    case 'log':
      return { type: 'log' }
    case 'status':
      return { type: 'status' }
    case 'cherry-pick':
      if (!rest[0]) return { error: 'usage: git cherry-pick <commit-hash>' }
      return { type: 'cherryPick', target: rest[0] }
    case 'reset': {
      const mode = rest.includes('--soft') ? 'soft' : 'hard'
      const target = rest.find((t) => !t.startsWith('-')) ?? 'HEAD~1'
      return { type: 'reset', target, mode }
    }
    case 'revert':
      if (!rest[0]) return { error: 'usage: git revert <commit-hash>' }
      return { type: 'revert', target: rest[0] }
    case 'stash': {
      const pop = rest[0] === 'pop'
      return { type: 'stash', pop, message: rest.slice(pop ? 1 : 0).join(' ') || undefined }
    }
    default:
      return {
        error:
          'Supported: init, status, commit -m [--amend] [file=content], branch, switch [-c], checkout [-b|--ours|--theirs], add, merge [--abort], rebase, cherry-pick, reset [--hard|--soft], revert, stash [pop], log',
      }
  }
}

import { gitSimulator, parseGitCommand, type GitAction, type GitEvent, type GitState } from '@/lib/sim/git'
import type { Lesson } from './types'

export const gitBranchingLesson: Lesson<GitState, GitAction, GitEvent> = {
  id: 'git-branching',
  domainId: 'git',
  title: 'Branching & Merging',
  subtitle: 'Watch the commit graph grow — and see that a branch is just a sticky note on a commit.',
  minutes: 12,
  level: 'Beginner',
  simulator: gitSimulator,
  config: undefined,
  legend: [
    { label: 'commit', tone: 'green' },
    { label: 'branch pointer', tone: 'lavender' },
    { label: 'HEAD', tone: 'yellow' },
  ],
  learn: [
    { text: 'A repository is a graph of commits, not a list', step: 2 },
    { text: 'A branch is a movable pointer to one commit', step: 4 },
    { text: 'HEAD tells Git where the next commit goes', step: 5 },
    { text: 'Merge commits have two parents', step: 7 },
    { text: 'When a merge is just a fast-forward', step: 8 },
  ],
  metrics: (s) => [
    { label: 'Commits', value: String(s.order.length), icon: 'commit' },
    { label: 'Branches', value: String(Object.keys(s.branches).length), icon: 'branch' },
    { label: 'HEAD', value: s.currentBranch ?? '—', icon: 'head', highlight: true },
    {
      label: 'Merge commits',
      value: String(s.order.filter((id) => s.commits[id].parents.length > 1).length),
      icon: 'activity',
    },
  ],
  parse: parseGitCommand,
  sandboxHints: ['git switch -c experiment', 'git commit -m "Try idea"', 'git switch main', 'git merge experiment', 'git log'],
  steps: [
    {
      label: 'Init',
      title: 'Start a repository',
      tag: 'CONCEPT',
      body: [
        'Your team is building `shop`, and everyone keeps overwriting each other. Git fixes that by recording **snapshots** of the project.',
        'Running `git init` creates an empty `.git` directory. There are no commits yet, but a branch called `main` already exists — it just points at nothing.',
      ],
      keyIdea: 'A Git repository is a database of snapshots plus a few named pointers into it.',
      changes: [
        { kind: 'add', text: '.git directory' },
        { kind: 'add', text: 'main (unborn branch)' },
      ],
      actions: [{ cmd: 'git init', action: { type: 'init' } }],
    },
    {
      label: 'Commit',
      title: 'Make the first commit',
      tag: 'TECHNIQUE',
      body: [
        'A **commit** is a full snapshot of the project, identified by a hash of its content and its parents.',
        'The first commit has no parent — it is the root of the graph. `main` now points at it.',
      ],
      keyIdea: 'Commit IDs are derived from content and parents, so history cannot be silently rewritten.',
      changes: [
        { kind: 'add', text: 'Root commit' },
        { kind: 'mod', text: 'main → root commit' },
      ],
      actions: [{ cmd: 'git commit -m "Initial commit"', action: { type: 'commit', message: 'Initial commit' } }],
    },
    {
      label: 'History',
      title: 'History is a chain of parents',
      tag: 'CONCEPT',
      body: [
        'Each new commit records the commit before it as its **parent**. Follow the parents backwards and you get the history.',
        'Notice that only the `main` label moves. Old commits never change.',
      ],
      keyIdea: 'Commits point backwards to their parents. Branches point forwards to the newest commit.',
      changes: [
        { kind: 'add', text: '2 commits' },
        { kind: 'mod', text: 'main moved forward twice' },
      ],
      actions: [
        { cmd: 'git commit -m "Add product grid"', action: { type: 'commit', message: 'Add product grid' } },
        { cmd: 'git commit -m "Add cart"', action: { type: 'commit', message: 'Add cart' } },
      ],
    },
    {
      label: 'Branch',
      title: 'A branch is just a pointer',
      tag: 'CONCEPT',
      body: [
        'You want to build search without breaking `main`. `git branch feature` creates a new label.',
        'Look closely: **no new commit appeared**. Both labels point at the same commit. Creating a branch costs 41 bytes.',
      ],
      keyIdea: 'Branching is cheap because nothing is copied — Git only writes a new reference.',
      changes: [
        { kind: 'add', text: 'feature → same commit as main' },
        { kind: 'mod', text: 'Commits: unchanged' },
      ],
      actions: [{ cmd: 'git branch feature', action: { type: 'branch', name: 'feature' } }],
    },
    {
      label: 'Switch',
      title: 'Move HEAD',
      tag: 'TECHNIQUE',
      body: [
        '`HEAD` is how Git knows which branch you are on. New commits are added wherever HEAD points.',
        '`git switch feature` moves HEAD. The graph is identical; only your position changed.',
      ],
      keyIdea: 'HEAD points to a branch, and the branch points to a commit.',
      changes: [{ kind: 'mod', text: 'HEAD: main → feature' }],
      actions: [{ cmd: 'git switch feature', action: { type: 'switch', name: 'feature' } }],
    },
    {
      label: 'Diverge',
      title: 'Two lines of work',
      tag: 'CONCEPT',
      body: [
        'You commit search work on `feature`. Meanwhile a typo is fixed directly on `main`.',
        'Now the two branches have **diverged**: each has a commit the other does not. The graph forks.',
      ],
      keyIdea: 'Divergence is normal. Git keeps both histories until you decide how to combine them.',
      changes: [
        { kind: 'add', text: '2 commits on feature' },
        { kind: 'add', text: '1 commit on main' },
        { kind: 'mod', text: 'HEAD back on main' },
      ],
      actions: [
        { cmd: 'git commit -m "Add search box"', action: { type: 'commit', message: 'Add search box' } },
        { cmd: 'git commit -m "Rank results"', action: { type: 'commit', message: 'Rank results' } },
        { cmd: 'git switch main', action: { type: 'switch', name: 'main' } },
        { cmd: 'git commit -m "Fix price typo"', action: { type: 'commit', message: 'Fix price typo' } },
      ],
    },
    {
      label: 'Merge',
      title: 'Join the histories',
      tag: 'TECHNIQUE',
      body: [
        'From `main`, run `git merge feature`. Since neither branch contains the other, Git creates a **merge commit**.',
        'A merge commit is the only kind with two parents. The `feature` label stays where it was.',
      ],
      keyIdea: 'A merge records that two lines of history came together — it does not rewrite either.',
      changes: [
        { kind: 'add', text: 'Merge commit (2 parents)' },
        { kind: 'mod', text: 'main → merge commit' },
      ],
      actions: [{ cmd: 'git merge feature', action: { type: 'merge', name: 'feature' } }],
    },
    {
      label: 'Fast-fwd',
      title: 'Sometimes there is nothing to merge',
      tag: 'PITFALL',
      body: [
        'A checkout bug needs a quick `hotfix` branch. While you work on it, nobody touches `main`.',
        'Merging now is a **fast-forward**: `main` is an ancestor of `hotfix`, so Git simply slides the label. No merge commit is created.',
      ],
      keyIdea: 'Fast-forward when history is linear; merge commit when it has diverged.',
      changes: [
        { kind: 'add', text: 'hotfix branch + 1 commit' },
        { kind: 'mod', text: 'main slid forward' },
        { kind: 'mod', text: 'Merge commits: unchanged' },
      ],
      actions: [
        { cmd: 'git switch -c hotfix', action: { type: 'switch', name: 'hotfix', create: true } },
        { cmd: 'git commit -m "Patch checkout bug"', action: { type: 'commit', message: 'Patch checkout bug' } },
        { cmd: 'git switch main', action: { type: 'switch', name: 'main' } },
        { cmd: 'git merge hotfix', action: { type: 'merge', name: 'hotfix' } },
      ],
    },
    {
      label: 'Practice',
      title: 'Your turn',
      tag: 'PRACTICE',
      body: [
        'The terminal below runs against the same simulator. Every command produces a new state — the old one is never mutated.',
        'Try creating a branch, committing on it, then merging. Can you produce a fast-forward and a merge commit?',
      ],
      keyIdea: 'Failed commands return an error and leave the previous state untouched.',
      actions: [],
      sandbox: true,
    },
    {
      label: 'Recap',
      title: 'What you learned',
      tag: 'RECAP',
      body: [
        'Commits form a graph by pointing to their parents. Branches and HEAD are lightweight pointers on top of that graph.',
        'Merging either fast-forwards a pointer or records a two-parent merge commit. Next up: **rebase**, which replays commits to create new ones.',
      ],
      keyIdea: 'Think in pointers: most Git commands just move labels around an immutable graph.',
      actions: [],
    },
  ],
}

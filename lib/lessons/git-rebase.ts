import { gitSimulator, parseGitCommand, reachableCommits, type GitAction, type GitEvent, type GitState } from '@/lib/sim/git'
import type { Lesson } from './types'

export const gitRebaseLesson: Lesson<GitState, GitAction, GitEvent> = {
  id: 'git-rebase',
  domainId: 'git',
  title: 'Rebase, Step by Step',
  subtitle: 'Replay your commits on a new base — and see why every rebased commit gets a brand-new hash.',
  minutes: 12,
  level: 'Intermediate',
  simulator: gitSimulator,
  config: undefined,
  legend: [
    { label: 'commit', tone: 'green' },
    { label: 'replayed from', tone: 'orange' },
    { label: 'branch pointer', tone: 'lavender' },
    { label: 'HEAD', tone: 'yellow' },
  ],
  learn: [
    { text: 'Rebase replays commits on top of another branch', step: 4 },
    { text: 'Replayed commits are new commits with new IDs', step: 5 },
    { text: 'Rebase + fast-forward gives a linear history', step: 6 },
    { text: 'Amending also rewrites history', step: 7 },
    { text: 'Never rebase commits others already pulled', step: 8 },
  ],
  metrics: (s) => {
    const reachable = reachableCommits(s)
    return [
      { label: 'On branches', value: String(reachable.size), icon: 'commit' },
      { label: 'Dangling', value: String(s.order.length - reachable.size), icon: 'activity' },
      { label: 'HEAD', value: s.currentBranch ?? '—', icon: 'head', highlight: true },
      {
        label: 'Merge commits',
        value: String(s.order.filter((id) => reachable.has(id) && s.commits[id].parents.length > 1).length),
        icon: 'branch',
      },
    ]
  },
  parse: parseGitCommand,
  sandboxHints: ['git switch -c spike', 'git commit -m "Try idea"', 'git rebase main', 'git commit --amend -m "Better name"', 'git log'],
  steps: [
    {
      label: 'Setup',
      title: 'Two branches, diverged',
      tag: 'CONCEPT',
      body: [
        'You started `search` from `main` two days ago and committed twice. Meanwhile teammates landed two commits on `main`.',
        'The branches have **diverged**. A merge would join them with a two-parent commit. Rebase offers a different way.',
      ],
      keyIdea: 'Rebase and merge solve the same problem — bringing in upstream work — with different history shapes.',
      changes: [
        { kind: 'add', text: 'search: 2 commits' },
        { kind: 'add', text: 'main: 2 new commits' },
      ],
      actions: [
        { cmd: 'git init', action: { type: 'init' } },
        { cmd: 'git commit -m "Initial shop"', action: { type: 'commit', message: 'Initial shop' } },
        { cmd: 'git switch -c search', action: { type: 'switch', name: 'search', create: true } },
        { cmd: 'git commit -m "Add search box"', action: { type: 'commit', message: 'Add search box', changes: { 'search.ts': 'box' } } },
        { cmd: 'git commit -m "Rank results"', action: { type: 'commit', message: 'Rank results', changes: { 'rank.ts': 'bm25' } } },
        { cmd: 'git switch main', action: { type: 'switch', name: 'main' } },
        { cmd: 'git commit -m "New header"', action: { type: 'commit', message: 'New header', changes: { 'header.ts': 'v2' } } },
        { cmd: 'git commit -m "Faster images"', action: { type: 'commit', message: 'Faster images', changes: { 'img.ts': 'avif' } } },
      ],
    },
    {
      label: 'Base',
      title: 'What is a "base"?',
      tag: 'CONCEPT',
      body: [
        'Every branch grows from a **base** commit — here, `Initial shop`. Your search work assumes the world as it was back then.',
        'Rebasing means: pretend you started from the *current* tip of `main` instead. Same changes, newer starting point.',
      ],
      keyIdea: 'The merge base is the newest commit both branches share.',
      actions: [{ cmd: 'git switch search', action: { type: 'switch', name: 'search' } }],
    },
    {
      label: 'Compare',
      title: 'Merge vs rebase',
      tag: 'CONCEPT',
      body: [
        'A **merge** keeps both lines and adds a commit tying them together. Truthful, but the graph gets braided.',
        'A **rebase** takes each of your commits, re-applies the diff on the new base, and moves your branch to the result. History looks like you wrote it today.',
      ],
      keyIdea: 'Merge preserves history; rebase rewrites your local history to be linear.',
      actions: [],
    },
    {
      label: 'Rebase',
      title: 'Replay onto main',
      tag: 'TECHNIQUE',
      body: [
        'Run `git rebase main` from `search`. Git finds commits on `search` that are not on `main` and replays them, oldest first.',
        'Orange arrows show each original commit and the copy it became. The `search` label jumps to the last copy.',
      ],
      keyIdea: 'Rebase = "find my commits, apply each diff on the new base, move my branch".',
      changes: [
        { kind: 'add', text: '2 replayed commits' },
        { kind: 'mod', text: 'search → new tip' },
      ],
      actions: [{ cmd: 'git rebase main', action: { type: 'rebase', onto: 'main' } }],
    },
    {
      label: 'New IDs',
      title: 'Why the hashes changed',
      tag: 'CONCEPT',
      body: [
        'A commit ID is a hash of its content **and its parent**. The replayed commits have new parents, so they must have new IDs.',
        'The faded originals still exist but no branch points at them. They are **dangling**, and Git will garbage-collect them eventually.',
      ],
      keyIdea: 'Rebase never moves commits. It creates copies and abandons the originals.',
      changes: [{ kind: 'mod', text: '2 commits now dangling' }],
      actions: [{ cmd: 'git log', action: { type: 'log' } }],
    },
    {
      label: 'Fast-fwd',
      title: 'A straight line',
      tag: 'TECHNIQUE',
      body: [
        'Because `search` now sits directly on top of `main`, merging it is a **fast-forward**. No merge commit needed.',
        'This is the popular "rebase then merge" workflow: tidy, linear history that reads top to bottom.',
      ],
      keyIdea: 'Rebase first, then fast-forward, for a history without merge bubbles.',
      changes: [{ kind: 'mod', text: 'main slid to search' }],
      actions: [
        { cmd: 'git switch main', action: { type: 'switch', name: 'main' } },
        { cmd: 'git merge search', action: { type: 'merge', name: 'search' } },
      ],
    },
    {
      label: 'Amend',
      title: 'Amend is a tiny rebase',
      tag: 'TECHNIQUE',
      body: [
        'You notice a typo and want to fix the last commit. `git commit --amend` builds a **replacement** commit with the same parent.',
        'Again the old commit fades out. Any command that edits a commit really makes a new one.',
      ],
      keyIdea: 'Commits are immutable. "Editing" history always means creating new commits.',
      changes: [
        { kind: 'add', text: 'Replacement commit' },
        { kind: 'mod', text: 'Old tip dangling' },
      ],
      actions: [
        { cmd: 'git commit -m "Track search clcks"', action: { type: 'commit', message: 'Track search clcks', changes: { 'analytics.ts': 'clicks' } } },
        { cmd: 'git commit --amend -m "Track search clicks"', action: { type: 'commit', message: 'Track search clicks', amend: true } },
      ],
    },
    {
      label: 'Golden rule',
      title: 'Do not rebase shared history',
      tag: 'PITFALL',
      body: [
        'If a teammate already pulled your original commits, rebasing gives you **different commits with the same changes**. Their next pull will duplicate work and conflict.',
        'Rule of thumb: rebase your own unpublished branch freely; never rebase `main` or any branch others build on.',
      ],
      keyIdea: 'Rebase local, merge public. Force-pushing rewritten history breaks everyone downstream.',
      actions: [],
    },
    {
      label: 'Practice',
      title: 'Your turn',
      tag: 'PRACTICE',
      body: [
        'Create a branch, commit on both it and `main`, then rebase. Watch for the orange replay arrows and the faded originals.',
        'Try `git commit --amend` too, and check how the Dangling metric grows.',
      ],
      keyIdea: 'If rebase produced zero copies, your branch was already up to date.',
      actions: [],
      sandbox: true,
    },
    {
      label: 'Recap',
      title: 'What you learned',
      tag: 'RECAP',
      body: [
        'Rebase replays your commits on a new base, creating new commits with new IDs. The originals are left dangling.',
        'Rebase + fast-forward yields linear history. Keep it to branches nobody else has pulled. Next: what happens when two changes touch the **same line**.',
      ],
      keyIdea: 'Merge records what happened; rebase rewrites it to look simpler.',
      actions: [],
    },
  ],
}

import { gitSimulator, parseGitCommand, type GitAction, type GitEvent, type GitState } from '@/lib/sim/git'
import type { Lesson } from './types'

export const gitConflictsLesson: Lesson<GitState, GitAction, GitEvent> = {
  id: 'git-conflicts',
  domainId: 'git',
  title: 'Resolving Conflicts',
  subtitle: 'Two branches edit the same line. See exactly when Git gives up — and how you finish the merge.',
  minutes: 10,
  level: 'Intermediate',
  simulator: gitSimulator,
  config: undefined,
  legend: [
    { label: 'ours (HEAD)', tone: 'blue' },
    { label: 'theirs (incoming)', tone: 'orange' },
    { label: 'resolved', tone: 'green' },
    { label: 'conflict', tone: 'pink' },
  ],
  learn: [
    { text: 'Git merges different files automatically', step: 3 },
    { text: 'A conflict is the same file changed on both sides', step: 4 },
    { text: 'How to read conflict markers', step: 5 },
    { text: 'You cannot commit until every file is resolved', step: 6 },
    { text: 'Resolve, add, commit — or abort', step: 8 },
  ],
  metrics: (s) => [
    { label: 'Commits', value: String(s.order.length), icon: 'commit' },
    { label: 'HEAD', value: s.currentBranch ?? '—', icon: 'head' },
    {
      label: 'Conflicts',
      value: s.merging ? String(s.merging.conflicts.filter((c) => c.resolved === undefined).length) : '0',
      icon: 'activity',
      highlight: Boolean(s.merging),
    },
    { label: 'Merging', value: s.merging ? s.merging.branch : 'no', icon: 'branch' },
  ],
  parse: parseGitCommand,
  sandboxHints: [
    'git merge --abort',
    'git switch -c promo',
    'git commit -m "Promo" cart.ts="total * 0.5"',
    'git checkout --theirs cart.ts',
    'git status',
  ],
  steps: [
    {
      label: 'Setup',
      title: 'One file, one line',
      tag: 'CONCEPT',
      body: [
        '`cart.ts` contains the line that computes the order `total`. Everyone touches it eventually.',
        'In this simulator, each commit lists the files it changes and the new content of the line.',
      ],
      keyIdea: 'Git tracks content line by line. Conflicts happen at the line level.',
      changes: [{ kind: 'add', text: 'cart.ts, README.md' }],
      actions: [
        { cmd: 'git init', action: { type: 'init' } },
        {
          cmd: 'git commit -m "Add cart" cart.ts="total = sum(items)"',
          action: { type: 'commit', message: 'Add cart', changes: { 'cart.ts': 'total = sum(items)' } },
        },
        {
          cmd: 'git commit -m "Docs" README.md="Shop"',
          action: { type: 'commit', message: 'Docs', changes: { 'README.md': 'Shop' } },
        },
      ],
    },
    {
      label: 'Discount',
      title: 'Feature: 10% discount',
      tag: 'CONCEPT',
      body: [
        'On branch `discount`, you change the total to apply 10% off.',
        'You also update the README. Both changes live only on `discount` for now.',
      ],
      changes: [{ kind: 'mod', text: 'cart.ts on discount' }],
      actions: [
        { cmd: 'git switch -c discount', action: { type: 'switch', name: 'discount', create: true } },
        {
          cmd: 'git commit -m "10% off" cart.ts="total = sum(items) * 0.9"',
          action: { type: 'commit', message: '10% off', changes: { 'cart.ts': 'total = sum(items) * 0.9' } },
        },
      ],
    },
    {
      label: 'Tax',
      title: 'Meanwhile on main: tax',
      tag: 'CONCEPT',
      body: [
        'A teammate adds sales tax to the **same line** on `main`, and separately edits `header.ts`.',
        'Changes to different files never conflict — Git just takes both. The trouble is `cart.ts`.',
      ],
      keyIdea: 'Git only needs your help when both sides changed the same lines since the merge base.',
      changes: [
        { kind: 'mod', text: 'cart.ts on main' },
        { kind: 'add', text: 'header.ts on main' },
      ],
      actions: [
        { cmd: 'git switch main', action: { type: 'switch', name: 'main' } },
        {
          cmd: 'git commit -m "Add tax" cart.ts="total = sum(items) + tax"',
          action: { type: 'commit', message: 'Add tax', changes: { 'cart.ts': 'total = sum(items) + tax' } },
        },
        {
          cmd: 'git commit -m "Header" header.ts="logo"',
          action: { type: 'commit', message: 'Header', changes: { 'header.ts': 'logo' } },
        },
      ],
    },
    {
      label: 'Merge',
      title: 'Automatic merge failed',
      tag: 'PITFALL',
      body: [
        '`git merge discount` compares each side against the merge base. `header.ts` changed on one side only — fine. `cart.ts` changed on **both** sides to different text.',
        'Git stops mid-merge. No commit is created yet; the repository is now in a **merging** state.',
      ],
      keyIdea: 'A conflict is not an error. It is Git asking a human to decide.',
      changes: [
        { kind: 'add', text: 'Conflict in cart.ts' },
        { kind: 'mod', text: 'State: merging' },
      ],
      actions: [{ cmd: 'git merge discount', action: { type: 'merge', name: 'discount' } }],
    },
    {
      label: 'Markers',
      title: 'Read the markers',
      tag: 'CONCEPT',
      body: [
        'Git writes both versions into the file. Between `<<<<<<< HEAD` and `=======` is **ours** — the branch you are on. Below it, until `>>>>>>>`, is **theirs**.',
        '`git status` lists the file as *both modified*.',
      ],
      keyIdea: 'HEAD is always "ours" — during a merge that is the branch you are merging into.',
      actions: [{ cmd: 'git status', action: { type: 'status' } }],
    },
    {
      label: 'Blocked',
      title: 'You cannot just commit',
      tag: 'PITFALL',
      body: [
        'Trying to commit now fails. Git refuses to record a snapshot that still contains conflict markers.',
        'Switching branches is blocked too. You must either finish the merge or abort it.',
      ],
      keyIdea: 'An unresolved conflict blocks commit, switch, merge and rebase.',
      actions: [{ cmd: 'git commit -m "Merge discount"', action: { type: 'commit', message: 'Merge discount' } }],
    },
    {
      label: 'Resolve',
      title: 'Decide, then add',
      tag: 'TECHNIQUE',
      body: [
        'The right answer here keeps **both** intents: discount *and* tax. You edit the line and remove the markers, then `git add cart.ts` to mark it resolved.',
        'Shortcuts exist: `git checkout --ours` or `--theirs` keeps one side entirely.',
      ],
      keyIdea: '`git add` on a conflicted file means "I have resolved this".',
      changes: [{ kind: 'mod', text: 'cart.ts resolved' }],
      actions: [
        {
          cmd: 'git add cart.ts',
          action: { type: 'resolve', file: 'cart.ts', strategy: 'both', content: 'total = sum(items) * 0.9 + tax' },
        },
      ],
    },
    {
      label: 'Conclude',
      title: 'Finish the merge',
      tag: 'TECHNIQUE',
      body: [
        'With every conflict resolved, `git commit` creates the merge commit. Its two parents are the tips of `main` and `discount`.',
        'The resolution is part of that commit, so anyone reading history can see how the conflict was settled.',
      ],
      keyIdea: 'A conflicted merge ends exactly like a clean one: a two-parent commit.',
      changes: [{ kind: 'add', text: 'Merge commit' }],
      actions: [{ cmd: 'git commit -m "Merge discount"', action: { type: 'commit', message: 'Merge discount' } }],
    },
    {
      label: 'Practice',
      title: 'Your turn',
      tag: 'PRACTICE',
      body: [
        'Make a conflict on purpose: create a branch, change `cart.ts` with `file=content` after the message, change it differently on `main`, then merge.',
        'Resolve with `git add`, `--ours` or `--theirs` — or bail out with `git merge --abort`.',
      ],
      keyIdea: 'Abort is always safe: it returns you to the state before the merge started.',
      actions: [],
      sandbox: true,
    },
    {
      label: 'Recap',
      title: 'What you learned',
      tag: 'RECAP',
      body: [
        'Git merges different files and different lines automatically. When both sides change the same line, it pauses and writes conflict markers.',
        'Resolve each file, `git add` it, then commit — or `git merge --abort`. Small, frequent merges keep conflicts small.',
      ],
      keyIdea: 'Merge often. The longer branches live apart, the bigger the conflicts.',
      actions: [],
    },
  ],
}

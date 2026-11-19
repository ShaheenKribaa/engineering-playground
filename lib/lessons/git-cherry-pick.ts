import { gitSimulator, parseGitCommand, reachableCommits, type GitAction, type GitEvent, type GitState } from '@/lib/sim/git'
import type { Lesson } from './types'

export const gitCherryPickLesson: Lesson<GitState, GitAction, GitEvent> = {
  id: 'git-cherry-pick',
  domainId: 'git',
  title: 'Cherry-Pick, Stash & Reset',
  subtitle: 'Surgically copy commits between branches, stash work-in-progress, and rewind branch tips.',
  minutes: 10,
  level: 'Intermediate',
  simulator: gitSimulator,
  config: undefined,
  legend: [
    { label: 'commit', tone: 'green' },
    { label: 'picked / replayed', tone: 'orange' },
    { label: 'branch pointer', tone: 'lavender' },
    { label: 'HEAD', tone: 'yellow' },
  ],
  learn: [
    { text: 'Cherry-pick copies an individual commit onto HEAD', step: 2 },
    { text: 'Cherry-picked commits receive new commit hashes', step: 3 },
    { text: 'git reset moves branch pointers backward', step: 4 },
    { text: 'Dangling commits are left behind after a reset', step: 5 },
    { text: 'git stash temporarily shelves uncommitted changes', step: 6 },
  ],
  metrics: (s) => {
    const reachable = reachableCommits(s)
    return [
      { label: 'Reachable', value: String(reachable.size), icon: 'commit' },
      { label: 'Dangling', value: String(s.order.length - reachable.size), icon: 'activity' },
      { label: 'HEAD', value: s.currentBranch ?? '—', icon: 'head', highlight: true },
      { label: 'Stashes', value: String(s.stash?.length ?? 0), icon: 'branch' },
    ]
  },
  parse: parseGitCommand,
  sandboxHints: [
    'git cherry-pick <hash>',
    'git reset --hard HEAD~1',
    'git stash',
    'git stash pop',
    'git log',
  ],
  steps: [
    {
      label: 'Setup',
      title: 'A commit on the wrong branch',
      tag: 'CONCEPT',
      body: [
        'Imagine you are working on a feature branch `hotfix` and landed a critical bug fix commit alongside experimental changes.',
        'You need that bug fix on `main` immediately without merging the unfinished feature branch.',
      ],
      keyIdea: 'You often need a single commit from another branch without pulling the entire branch along.',
      changes: [
        { kind: 'add', text: 'main: initial release' },
        { kind: 'add', text: 'feature: 2 commits (including hotfix)' },
      ],
      actions: [
        { cmd: 'git init', action: { type: 'init' } },
        { cmd: 'git commit -m "Initial release"', action: { type: 'commit', message: 'Initial release' } },
        { cmd: 'git switch -c feature', action: { type: 'switch', name: 'feature', create: true } },
        { cmd: 'git commit -m "Fix memory leak"', action: { type: 'commit', message: 'Fix memory leak', changes: { 'alloc.ts': 'leak-fix' } } },
        { cmd: 'git commit -m "WIP experimental UI"', action: { type: 'commit', message: 'WIP experimental UI', changes: { 'ui.tsx': 'wip' } } },
      ],
    },
    {
      label: 'Switch',
      title: 'Return to main',
      tag: 'TECHNIQUE',
      body: [
        'To apply a cherry-pick, switch to the destination branch where you want the commit to land.',
        'Here we switch back to `main`.',
      ],
      keyIdea: 'Cherry-pick always applies the new commit on top of your current HEAD.',
      changes: [{ kind: 'mod', text: 'HEAD → main' }],
      actions: [{ cmd: 'git switch main', action: { type: 'switch', name: 'main' } }],
    },
    {
      label: 'Cherry-Pick',
      title: 'Pick only the fix',
      tag: 'TECHNIQUE',
      body: [
        'Run `git cherry-pick <hash>` pointing to the "Fix memory leak" commit.',
        'Git extracts the diff introduced by that specific commit, applies it onto `main`, and creates a brand-new commit with the same message and changes.',
      ],
      keyIdea: 'git cherry-pick duplicates changes into a new commit on the current branch.',
      changes: [
        { kind: 'add', text: 'Picked commit on main' },
        { kind: 'mod', text: 'main advanced by 1' },
      ],
      actions: [{ cmd: 'git cherry-pick feature', action: { type: 'cherryPick', target: 'feature' } }],
    },
    {
      label: 'Reset',
      title: 'Rewind with git reset',
      tag: 'TECHNIQUE',
      body: [
        'What if you commit something by accident? `git reset HEAD~1` rewinds the current branch pointer back by one commit.',
        'With `--hard`, changes in the working tree are discarded as well.',
      ],
      keyIdea: 'git reset moves the current branch pointer to a previous commit.',
      changes: [{ kind: 'mod', text: 'main rewound to initial' }],
      actions: [{ cmd: 'git reset --hard HEAD~1', action: { type: 'reset', target: 'HEAD~1', mode: 'hard' } }],
    },
    {
      label: 'Dangling',
      title: 'Where did the commit go?',
      tag: 'CONCEPT',
      body: [
        'The commit you rewound did not vanish from disk immediately. It is still in Git’s object store, but no branch points to it.',
        'Notice the Dangling count increased. Git’s reflog and garbage collector keep dangling commits for a safety window (typically 30-90 days).',
      ],
      keyIdea: 'Git commits are append-only. Rewinding a branch creates dangling objects.',
      actions: [{ cmd: 'git log', action: { type: 'log' } }],
    },
    {
      label: 'Stash',
      title: 'Save work-in-progress',
      tag: 'TECHNIQUE',
      body: [
        'Suppose you are mid-edit and need to urgently switch branches or pull upstream, but your code is not ready to commit.',
        '`git stash` saves dirty working tree state onto a stack and cleans your directory.',
      ],
      keyIdea: 'git stash temporarily shelves uncommitted changes so you have a clean working tree.',
      changes: [{ kind: 'add', text: 'Stash entry created' }],
      actions: [
        { cmd: 'git stash', action: { type: 'stash', message: 'WIP on main' } },
        { cmd: 'git stash pop', action: { type: 'stash', pop: true } },
      ],
    },
    {
      label: 'Practice',
      title: 'Your turn in the sandbox',
      tag: 'PRACTICE',
      body: [
        'Experiment with surgical history editing! Create a branch, commit, switch, cherry-pick by hash or branch name, and test `git reset --hard HEAD~1`.',
        'Check metrics to see how reachable and dangling commits change dynamically.',
      ],
      keyIdea: 'Mastering cherry-pick, reset, and stash gives you complete control over your commits.',
      actions: [],
      sandbox: true,
    },
    {
      label: 'Recap',
      title: 'Key Takeaways',
      tag: 'RECAP',
      body: [
        '`git cherry-pick <commit>` copies an isolated change onto your current branch.',
        '`git reset` moves branch references backward (leaving commits dangling).',
        '`git stash` and `git stash pop` provide a quick clipboard for in-flight work.',
      ],
      keyIdea: 'You now know how to extract, rewind, and temporarily store any Git state.',
      actions: [],
    },
  ],
}

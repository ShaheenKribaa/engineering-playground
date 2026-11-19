'use client'

import { BookOpen, Boxes, FlaskConical, Menu, Moon, ScrollText, Search, Sun, Terminal } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useShell } from './shell-context'

const NAV = [
  { label: 'Learn', icon: BookOpen, active: true },
  { label: 'Challenges', icon: Terminal, active: false },
  { label: 'Sim Lab', icon: FlaskConical, active: false },
  { label: 'Cheatsheets', icon: ScrollText, active: false },
]

export function AppHeader() {
  const { query, setQuery, setNavOpen } = useShell()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        className="flex size-9 items-center justify-center rounded-md border border-ink/70 bg-card lg:hidden"
        aria-label="Open course navigation"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      <Link href="/learn/git-branching/1" className="flex shrink-0 items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md border-[1.5px] border-ink bg-tint-yellow hard-shadow-sm">
          <Boxes className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-bold tracking-tight sm:text-base">
          Engineering <span className="bg-tint-green px-0.5">Playground</span>
        </span>
      </Link>

      <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
        {NAV.map(({ label, icon: Icon, active }) =>
          active ? (
            <span
              key={label}
              aria-current="page"
              className="flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-tint-green px-4 py-1.5 text-sm font-semibold hard-shadow"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
          ) : (
            <span
              key={label}
              title="Coming soon"
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
          ),
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <label className="relative hidden sm:block">
          <span className="sr-only">Search lessons</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons…"
            className="h-9 w-56 rounded-md border border-ink/40 bg-card pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-ink focus-visible:outline-none xl:w-72"
          />
        </label>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn('flex size-9 items-center justify-center rounded-md border border-ink/40 bg-card hover:border-ink')}
          aria-label="Toggle color theme"
        >
          <Moon className="size-4 dark:hidden" aria-hidden="true" />
          <Sun className="hidden size-4 dark:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

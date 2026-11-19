'use client'

import { BookOpen, Boxes, FlaskConical, Menu, Moon, ScrollText, Search, Sun, Terminal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useShell } from './shell-context'

const NAV = [
  { label: 'Learn', href: '/learn/git-branching/1', match: '/learn', icon: BookOpen },
  { label: 'Challenges', href: '/challenges', match: '/challenges', icon: Terminal },
  { label: 'Sim Lab', href: '/lab', match: '/lab', icon: FlaskConical },
  { label: 'Cheatsheets', href: '/cheatsheets', match: '/cheatsheets', icon: ScrollText },
]

export function AppHeader() {
  const pathname = usePathname()
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
        {NAV.map(({ label, href, match, icon: Icon }) => {
          const isActive = pathname.startsWith(match)
          return (
            <Link
              key={label}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-[1.5px] border-ink bg-tint-green hard-shadow'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
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

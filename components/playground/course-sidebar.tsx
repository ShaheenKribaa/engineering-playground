'use client'

import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Lock, X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { domains, playableLessonIds } from '@/lib/lessons/catalog'
import { toneText } from '@/lib/tones'
import { cn } from '@/lib/utils'
import { useShell } from './shell-context'

const totalLessons = domains.reduce((n, d) => n + d.lessons.length, 0)

export function CourseSidebar() {
  const { navOpen, setNavOpen } = useShell()
  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:flex">
        <SidebarContent />
      </aside>
      {navOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Course navigation">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30"
            aria-label="Close course navigation"
            onClick={() => setNavOpen(false)}
          />
          <div className="relative flex w-72 max-w-[85vw] bg-background p-3">
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-md border border-ink/40 bg-card"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}

function SidebarContent() {
  const params = useParams<{ lessonId?: string }>()
  const activeId = params.lessonId
  const { completed, query, setQuery, setNavOpen } = useShell()
  const activeDomain = domains.find((d) => d.lessons.some((l) => l.id === activeId))?.id
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeDomain ? [activeDomain] : ['git']))
  const q = query.trim().toLowerCase()

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex min-h-0 w-full flex-col gap-3">
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Folder className="size-4 fill-ink" aria-hidden="true" />
          Tracks
        </span>
        <span className="text-xs text-muted-foreground">{totalLessons} lessons</span>
      </div>

      <label className="px-1 sm:hidden">
        <span className="sr-only">Search lessons</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons…"
          className="h-9 w-full rounded-md border border-ink/40 bg-card px-3 text-sm"
        />
      </label>

      <nav aria-label="Course" className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ul className="flex flex-col gap-1">
          {domains.map((domain, di) => {
            const matching = q ? domain.lessons.filter((l) => l.title.toLowerCase().includes(q) || domain.title.toLowerCase().includes(q)) : domain.lessons
            if (q && matching.length === 0) return null
            const isOpen = q ? true : open.has(domain.id)
            const done = domain.lessons.filter((l) => completed.has(l.id)).length
            const FolderIcon = isOpen ? FolderOpen : Folder
            return (
              <li key={domain.id}>
                <button
                  type="button"
                  onClick={() => toggle(domain.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                  <FolderIcon className={cn('size-4 fill-current', toneText[domain.tone])} aria-hidden="true" />
                  <span className="flex-1 font-medium">
                    {String(di + 1).padStart(2, '0')}. {domain.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{domain.lessons.length}
                  </span>
                </button>
                {isOpen && (
                  <ul className="mt-0.5 mb-1 ml-[18px] flex flex-col gap-0.5 border-l border-ink/30 pl-3">
                    {matching.map((lesson) => {
                      const active = lesson.id === activeId
                      if (!lesson.playable) {
                        return (
                          <li key={lesson.id}>
                            <span className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground" title="Coming soon">
                              <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                              <span className="flex-1 truncate">{lesson.title}</span>
                              <span className="text-[10px] uppercase">soon</span>
                            </span>
                          </li>
                        )
                      }
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/${lesson.id}/1`}
                            onClick={() => setNavOpen(false)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                              active
                                ? 'border-[1.5px] border-ink bg-tint-green font-semibold hard-shadow'
                                : 'hover:bg-accent',
                            )}
                          >
                            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="flex-1 truncate">{lesson.title}</span>
                            {completed.has(lesson.id) && (
                              <span className="text-strong-green" aria-label="completed">
                                ✓
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between rounded-lg border border-ink/30 bg-card px-4 py-3 text-sm">
        <span className="font-semibold tracking-wide uppercase">Progress</span>
        <span className="text-muted-foreground">
          {completed.size} / {playableLessonIds.length} playable
        </span>
      </div>
    </div>
  )
}

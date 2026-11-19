'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface ShellContextValue {
  completed: Set<string>
  markComplete: (lessonId: string) => void
  query: string
  setQuery: (q: string) => void
  navOpen: boolean
  setNavOpen: (open: boolean) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  const markComplete = useCallback((lessonId: string) => {
    setCompleted((prev) => (prev.has(lessonId) ? prev : new Set(prev).add(lessonId)))
  }, [])

  const value = useMemo(
    () => ({ completed, markComplete, query, setQuery, navOpen, setNavOpen }),
    [completed, markComplete, query, navOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used inside ShellProvider')
  return ctx
}

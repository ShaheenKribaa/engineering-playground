'use client'

import { useEffect, useRef, useState } from 'react'
import type { Frame } from '@/lib/sim/timeline'
import { cn } from '@/lib/utils'

interface Props {
  lines: Frame[]
  interactive: boolean
  hints?: string[]
  onRun?: (input: string) => void
  pendingCount: number
}

export function CommandConsole({ lines, interactive, hints, onRun, pendingCount }: Props) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines.length])

  const submit = () => {
    const value = input.trim()
    if (!value || !onRun) return
    onRun(value)
    setInput('')
  }

  return (
    <div className="overflow-hidden rounded-lg border-[1.5px] border-ink bg-ink text-[12px] text-background dark:bg-[oklch(0.14_0.01_70)] dark:text-foreground">
      <div className="flex items-center gap-1.5 border-b border-background/15 px-3 py-1.5">
        <span className="size-2 rounded-full bg-strong-pink" aria-hidden="true" />
        <span className="size-2 rounded-full bg-strong-yellow" aria-hidden="true" />
        <span className="size-2 rounded-full bg-strong-green" aria-hidden="true" />
        <span className="ml-2 text-[10px] tracking-wider uppercase opacity-60">
          {interactive ? 'sandbox · try your own commands' : 'terminal'}
        </span>
      </div>
      <div ref={scrollRef} className="max-h-32 min-h-16 overflow-y-auto px-3 py-2" aria-live="polite">
        {lines.length === 0 && (
          <p className="opacity-50">
            {pendingCount > 0 ? 'Waiting to run commands…' : 'No commands in this step. Read the notes on the right.'}
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className="mb-1">
            <p>
              <span className="text-tint-green">$</span> {l.cmd}
            </p>
            {l.feedback && (
              <p className={cn('pl-3', l.status === 'failure' ? 'text-tint-pink' : 'opacity-65')}>
                {l.status === 'failure' ? '✗ ' : '→ '}
                {l.feedback}
              </p>
            )}
          </div>
        ))}
      </div>
      {interactive && (
        <div className="border-t border-background/15 px-3 py-2">
          {hints && hints.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {hints.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setInput(h)}
                  className="rounded border border-background/25 px-1.5 py-0.5 text-[10.5px] opacity-80 hover:opacity-100"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <label htmlFor="sandbox-input" className="text-tint-green">
              $<span className="sr-only">Command</span>
            </label>
            <input
              id="sandbox-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="type a command and press Enter"
              className="flex-1 bg-transparent outline-none placeholder:opacity-40"
            />
          </form>
        </div>
      )}
    </div>
  )
}

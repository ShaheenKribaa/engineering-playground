import Link from 'next/link'
import type { Lesson } from '@/lib/lessons/types'
import { cn } from '@/lib/utils'

export function LessonStepper({ lesson, stepIndex }: { lesson: Lesson; stepIndex: number }) {
  const count = lesson.steps.length
  return (
    <section aria-label="Lesson steps" className="rounded-xl border border-ink/30 bg-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <h2 className="font-semibold tracking-wide uppercase">In this lesson</h2>
        <span className="text-muted-foreground">
          Step {stepIndex + 1} of {count}
        </span>
      </div>
      <ol className="flex overflow-x-auto pb-1">
        {lesson.steps.map((step, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'
          return (
            <li key={step.label} className="relative flex min-w-16 flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 right-1/2 h-[1.5px] w-full',
                    i <= stepIndex ? 'bg-ink' : 'bg-ink/25',
                  )}
                />
              )}
              <Link
                href={`/learn/${lesson.id}/${i + 1}`}
                aria-current={state === 'current' ? 'step' : undefined}
                className="group relative z-10 flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold transition-colors',
                    state === 'current' && 'size-7 border-ink bg-tint-green hard-shadow-sm',
                    state === 'done' && 'border-ink bg-tint-green/60',
                    state === 'todo' && 'border-ink/40 bg-card text-muted-foreground group-hover:border-ink',
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'text-center text-[11px] whitespace-nowrap',
                    state === 'current' ? 'font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

import { Check } from 'lucide-react'
import type { Lesson } from '@/lib/lessons/types'
import { cn } from '@/lib/utils'

export function LearnChecklist({ lesson, stepIndex }: { lesson: Lesson; stepIndex: number }) {
  return (
    <section aria-labelledby="learn-title" className="rounded-xl border border-ink/30 bg-card p-4">
      <h2 id="learn-title" className="text-xs font-semibold tracking-wide uppercase">
        You&apos;ll learn
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {lesson.learn.map((item) => {
          const done = stepIndex + 1 >= item.step
          return (
            <li key={item.text} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  'mt-px flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]',
                  done ? 'border-ink bg-tint-green' : 'border-ink/40',
                )}
              >
                {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
              </span>
              <span className={cn(!done && 'text-muted-foreground')}>
                {item.text}
                <span className="sr-only">{done ? ' (covered)' : ' (upcoming)'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { ArrowLeft, ArrowRight, Lightbulb, Minus, Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { lessons, nextPlayableLesson } from '@/lib/lessons/catalog'
import type { Lesson } from '@/lib/lessons/types'
import { tagTone, toneBg } from '@/lib/tones'
import { cn } from '@/lib/utils'
import { RichText } from './rich-text'

const CHANGE_ICON = { add: Plus, mod: RefreshCw, del: Minus }
const CHANGE_STYLE = {
  add: 'bg-tint-green text-strong-green',
  mod: 'bg-tint-yellow text-strong-yellow',
  del: 'bg-tint-pink text-strong-pink',
}

export function StepPanel({ lesson, stepIndex }: { lesson: Lesson; stepIndex: number }) {
  const step = lesson.steps[stepIndex]
  const isLast = stepIndex === lesson.steps.length - 1
  const nextLessonId = isLast ? nextPlayableLesson(lesson.id) : undefined
  const nextHref = isLast
    ? `/learn/${nextLessonId ?? 'git-branching'}/1`
    : `/learn/${lesson.id}/${stepIndex + 2}`
  const nextLabel = isLast
    ? nextLessonId
      ? `Next: ${lessons[nextLessonId].title}`
      : 'Start over'
    : `Next: ${lesson.steps[stepIndex + 1].label}`

  return (
    <section aria-labelledby="step-title" className="flex flex-col rounded-xl border border-ink/30 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide">
          STEP {stepIndex + 1} / {lesson.steps.length}
        </span>
        <span
          className={cn(
            'rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[10px] font-bold tracking-wider',
            toneBg[tagTone[step.tag]],
          )}
        >
          {step.tag}
        </span>
      </div>

      <h2 id="step-title" className="mt-3 text-lg font-bold text-balance">
        {step.title}
      </h2>

      <div className="mt-2 flex flex-col gap-3 text-[13px] leading-relaxed text-pretty">
        {step.body.map((p, i) => (
          <p key={i}>
            <RichText text={p} />
          </p>
        ))}
      </div>

      {step.keyIdea && (
        <aside className="mt-4 flex gap-3 rounded-lg border border-strong-lavender/40 bg-tint-lavender/70 p-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border-[1.5px] border-ink bg-card">
            <Lightbulb className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-strong-lavender uppercase">Key idea</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              <RichText text={step.keyIdea} />
            </p>
          </div>
        </aside>
      )}

      {step.changes && step.changes.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">What changed</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {step.changes.map((c) => {
              const Icon = CHANGE_ICON[c.kind]
              return (
                <li key={c.text} className="flex items-center gap-2 text-xs">
                  <span className={cn('flex size-4 items-center justify-center rounded-sm', CHANGE_STYLE[c.kind])}>
                    <Icon className="size-2.5" strokeWidth={3} aria-hidden="true" />
                    <span className="sr-only">{c.kind === 'add' ? 'Added' : c.kind === 'mod' ? 'Changed' : 'Removed'}</span>
                  </span>
                  {c.text}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-2 pt-2 xl:mt-auto">
        {stepIndex > 0 ? (
          <Link
            href={`/learn/${lesson.id}/${stepIndex}`}
            className="flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-card px-3 py-2 text-xs font-semibold hard-shadow-sm hover:bg-accent"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back
          </Link>
        ) : (
          <span className="flex cursor-not-allowed items-center gap-2 rounded-md border-[1.5px] border-ink/30 px-3 py-2 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back
          </span>
        )}
        <Link
          href={nextHref}
          className="flex flex-1 items-center justify-between gap-2 rounded-md border-[1.5px] border-ink bg-tint-green px-3 py-2 text-xs font-semibold hard-shadow hover:translate-x-px hover:translate-y-px"
        >
          <span className="truncate">{nextLabel}</span>
          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

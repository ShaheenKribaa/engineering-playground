'use client'

import { BarChart3, Clock, ListOrdered } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { lessonPosition, lessons } from '@/lib/lessons/catalog'
import { LearnChecklist } from './learn-checklist'
import { LessonCanvas } from './lesson-canvas'
import { LessonStepper } from './lesson-stepper'
import { useShell } from './shell-context'
import { StepPanel } from './step-panel'

export function LessonPlayer({ lessonId, stepIndex }: { lessonId: string; stepIndex: number }) {
  const lesson = lessons[lessonId]
  const router = useRouter()
  const { markComplete } = useShell()
  const { domain, domainIndex, lessonIndex } = lessonPosition(lessonId)
  const count = lesson.steps.length

  useEffect(() => {
    if (stepIndex === count - 1) markComplete(lessonId)
  }, [stepIndex, count, lessonId, markComplete])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'ArrowRight' && stepIndex < count - 1) router.push(`/learn/${lessonId}/${stepIndex + 2}`)
      if (e.key === 'ArrowLeft' && stepIndex > 0) router.push(`/learn/${lessonId}/${stepIndex}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, lessonId, stepIndex, count])

  return (
    <div className="flex flex-col gap-3 xl:h-full xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-ink/30 bg-card/40 p-3 xl:min-h-0 xl:overflow-y-auto">
        <header className="flex flex-wrap items-start justify-between gap-3 px-1 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">
              {String(domainIndex + 1).padStart(2, '0')}. {domain?.title} <span aria-hidden="true">/</span> Lesson{' '}
              {lessonIndex + 1} of {domain?.lessons.length}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{lesson.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{lesson.subtitle}</p>
          </div>
          <ul className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <li className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-tint-yellow px-2.5 py-1">
              <Clock className="size-3" aria-hidden="true" />
              {lesson.minutes} min
            </li>
            <li className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-tint-green px-2.5 py-1">
              <BarChart3 className="size-3" aria-hidden="true" />
              {lesson.level}
            </li>
            <li className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-tint-lavender px-2.5 py-1">
              <ListOrdered className="size-3" aria-hidden="true" />
              {count} steps
            </li>
          </ul>
        </header>

        <LessonCanvas key={`${lessonId}-${stepIndex}`} lesson={lesson} stepIndex={stepIndex} />
        <LessonStepper lesson={lesson} stepIndex={stepIndex} />
      </div>

      <div className="flex w-full flex-col gap-3 xl:w-[340px] xl:shrink-0 xl:overflow-y-auto">
        <StepPanel lesson={lesson} stepIndex={stepIndex} />
        <LearnChecklist lesson={lesson} stepIndex={stepIndex} />
      </div>
    </div>
  )
}

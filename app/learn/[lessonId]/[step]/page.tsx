import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonPlayer } from '@/components/playground/lesson-player'
import { lessons } from '@/lib/lessons/catalog'

interface Props {
  params: Promise<{ lessonId: string; step: string }>
}

export function generateStaticParams() {
  return Object.values(lessons).flatMap((l) => l.steps.map((_, i) => ({ lessonId: l.id, step: String(i + 1) })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params
  const lesson = lessons[lessonId]
  return lesson ? { title: lesson.title, description: lesson.subtitle } : {}
}

export default async function StepPage({ params }: Props) {
  const { lessonId, step } = await params
  const lesson = lessons[lessonId]
  const stepIndex = Number(step) - 1
  if (!lesson || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= lesson.steps.length) notFound()
  return <LessonPlayer lessonId={lessonId} stepIndex={stepIndex} />
}

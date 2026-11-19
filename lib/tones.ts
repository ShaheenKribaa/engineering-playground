import type { StepTag, Tone } from '@/lib/lessons/types'

export const toneBg: Record<Tone, string> = {
  green: 'bg-tint-green',
  yellow: 'bg-tint-yellow',
  lavender: 'bg-tint-lavender',
  blue: 'bg-tint-blue',
  orange: 'bg-tint-orange',
  pink: 'bg-tint-pink',
}

export const toneText: Record<Tone, string> = {
  green: 'text-strong-green',
  yellow: 'text-strong-yellow',
  lavender: 'text-strong-lavender',
  blue: 'text-strong-blue',
  orange: 'text-strong-orange',
  pink: 'text-strong-pink',
}

export const tintVar = (tone: Tone) => `var(--tint-${tone})`
export const strongVar = (tone: Tone) => `var(--strong-${tone})`

export const tagTone: Record<StepTag, Tone> = {
  CONCEPT: 'lavender',
  TECHNIQUE: 'blue',
  PITFALL: 'pink',
  PRACTICE: 'green',
  RECAP: 'yellow',
}

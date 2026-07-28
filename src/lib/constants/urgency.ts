/** 緊急度。DB には英語値を保存し、画面には日本語を表示する。 */

export const URGENCY_VALUES = ['normal', 'soon', 'urgent'] as const

export type Urgency = (typeof URGENCY_VALUES)[number]

export const URGENCY_LABELS: Record<Urgency, string> = {
  normal: '通常',
  soon: 'できるだけ早く',
  urgent: '緊急',
}

export const URGENCY_DESCRIPTIONS: Record<Urgency, string> = {
  normal: '日程はご相談のうえ調整します。',
  soon: '2週間以内を目安に着手を希望します。',
  urgent: '入居・退去や設備停止などで急ぎ対応が必要です。',
}

export const URGENCY_TONES: Record<Urgency, 'neutral' | 'info' | 'action'> = {
  normal: 'neutral',
  soon: 'info',
  urgent: 'action',
}

export function isUrgency(value: unknown): value is Urgency {
  return typeof value === 'string' && (URGENCY_VALUES as readonly string[]).includes(value)
}

export function urgencyLabel(value: string): string {
  return isUrgency(value) ? URGENCY_LABELS[value] : value
}

export const URGENCY_OPTIONS = URGENCY_VALUES.map((value) => ({
  value,
  label: URGENCY_LABELS[value],
  description: URGENCY_DESCRIPTIONS[value],
}))

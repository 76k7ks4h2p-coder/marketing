/** 案件ステータス。DB には英語値を保存し、画面には日本語を表示する。 */

export const REQUEST_STATUS_VALUES = [
  'submitted',
  'reviewing',
  'collecting_quotes',
  'quotes_ready',
  'provider_selected',
  'scheduling',
  'in_progress',
  'completed',
  'cancelled',
] as const

export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number]

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: '依頼受付',
  reviewing: '内容確認中',
  collecting_quotes: '見積もり取得中',
  quotes_ready: '見積もり確認待ち',
  provider_selected: '業者選択済み',
  scheduling: '日程調整中',
  in_progress: '作業中',
  completed: '完了',
  cancelled: 'キャンセル',
}

/** ステータスバッジの配色。色だけに意味を持たせず、必ずラベルを併記する。 */
export const REQUEST_STATUS_TONES: Record<
  RequestStatus,
  'neutral' | 'info' | 'action' | 'success' | 'muted'
> = {
  submitted: 'info',
  reviewing: 'info',
  collecting_quotes: 'info',
  quotes_ready: 'action',
  provider_selected: 'neutral',
  scheduling: 'neutral',
  in_progress: 'neutral',
  completed: 'success',
  cancelled: 'muted',
}

/** 作業がまだ終わっていない（対応中の）ステータス。 */
export const ACTIVE_REQUEST_STATUSES: readonly RequestStatus[] = [
  'submitted',
  'reviewing',
  'collecting_quotes',
  'quotes_ready',
  'provider_selected',
  'scheduling',
  'in_progress',
]

/** これ以上、見積もり選択などの操作を受け付けないステータス。 */
export const CLOSED_REQUEST_STATUSES: readonly RequestStatus[] = ['completed', 'cancelled']

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUS_VALUES as readonly string[]).includes(value)
}

export function requestStatusLabel(value: string): string {
  return isRequestStatus(value) ? REQUEST_STATUS_LABELS[value] : value
}

export const REQUEST_STATUS_OPTIONS = REQUEST_STATUS_VALUES.map((value) => ({
  value,
  label: REQUEST_STATUS_LABELS[value],
}))

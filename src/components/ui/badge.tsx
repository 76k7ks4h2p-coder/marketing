import { REQUEST_STATUS_TONES, requestStatusLabel, isRequestStatus } from '@/lib/constants/statuses'
import { serviceCategoryLabel } from '@/lib/constants/categories'
import { URGENCY_TONES, isUrgency, urgencyLabel } from '@/lib/constants/urgency'
import {
  QUOTE_PUBLICATION_STATUS_TONES,
  isQuotePublicationStatus,
  quotePublicationStatusLabel,
} from '@/lib/constants/quotes'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'info' | 'action' | 'success' | 'muted'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-ink-700 border-slate-300',
  info: 'bg-brand-50 text-brand-800 border-brand-200',
  action: 'bg-amber-50 text-amber-900 border-amber-300',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  muted: 'bg-slate-50 text-ink-500 border-slate-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** 案件ステータスのバッジ。ダッシュボード・一覧・詳細で共通して使う。 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = isRequestStatus(status) ? REQUEST_STATUS_TONES[status] : 'neutral'
  return (
    <Badge tone={tone} className={className}>
      {requestStatusLabel(status)}
    </Badge>
  )
}

/** 作業カテゴリーのバッジ。 */
export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <Badge tone="neutral" className={className}>
      {serviceCategoryLabel(category)}
    </Badge>
  )
}

/** 緊急度のバッジ。 */
export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  const tone = isUrgency(urgency) ? URGENCY_TONES[urgency] : 'neutral'
  return (
    <Badge tone={tone} className={className}>
      {urgencyLabel(urgency)}
    </Badge>
  )
}

/** 見積もりの公開状態バッジ（管理画面用）。 */
export function PublicationBadge({ status, className }: { status: string; className?: string }) {
  const tone = isQuotePublicationStatus(status) ? QUOTE_PUBLICATION_STATUS_TONES[status] : 'neutral'
  return (
    <Badge tone={tone} className={className}>
      {quotePublicationStatusLabel(status)}
    </Badge>
  )
}

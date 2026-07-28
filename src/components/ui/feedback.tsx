import { AlertCircle, CheckCircle2, Info, Loader2, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type AlertVariant = 'error' | 'success' | 'info' | 'warning'

const ALERT_STYLES: Record<AlertVariant, { className: string; Icon: typeof Info; label: string }> =
  {
    error: {
      className: 'border-red-300 bg-red-50 text-red-900',
      Icon: AlertCircle,
      label: 'エラー',
    },
    success: {
      className: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      Icon: CheckCircle2,
      label: '完了',
    },
    info: {
      className: 'border-brand-200 bg-brand-50 text-brand-900',
      Icon: Info,
      label: 'お知らせ',
    },
    warning: {
      className: 'border-amber-300 bg-amber-50 text-amber-900',
      Icon: AlertCircle,
      label: '注意',
    },
  }

/**
 * メッセージ表示。色だけに意味を持たせず、アイコンと見出しテキストを併記する。
 */
export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: AlertVariant
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { className: variantClassName, Icon, label } = ALERT_STYLES[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
        variantClassName,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{title ?? label}</p>
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  )
}

/** フォーム全体のエラーメッセージ。 */
export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <Alert variant="error" title="入力内容をご確認ください">
      {children}
    </Alert>
  )
}

/** データが 0 件のときの表示。 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <span className="text-slate-400" aria-hidden="true">
        {icon ?? <Inbox className="h-8 w-8" />}
      </span>
      <div className="space-y-1">
        <p className="font-medium text-ink-900">{title}</p>
        {description ? <p className="text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** 読み込み中の表示（Suspense の fallback など）。 */
export function LoadingState({ label = '読み込み中です…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-ink-500">
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/** 一覧のスケルトン。 */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="読み込み中です">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  )
}

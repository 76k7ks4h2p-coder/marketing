import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** 画面タイトル。h1 は 1 画面に 1 つ。 */
export function PageTitle({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="mb-5 space-y-2">
      {eyebrow ? <div className="text-sm text-ink-500">{eyebrow}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold break-words text-ink-900 sm:text-2xl">{title}</h1>
          {description ? <p className="text-sm text-ink-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

/** 白いカード。 */
export function Card({
  children,
  className,
  as: Component = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return (
    <Component className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}>
      {children}
    </Component>
  )
}

/** セクション見出し付きのカード。見出しレベルは呼び出し側で指定する。 */
export function SectionCard({
  title,
  headingLevel = 2,
  description,
  actions,
  children,
  className,
  id,
}: {
  title: string
  headingLevel?: 2 | 3
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section id={id} className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <Heading className="text-base font-semibold text-ink-900">{title}</Heading>
          {description ? <p className="text-xs text-ink-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** ラベルと値の一覧。モバイルでは縦積み、広い画面では 2 カラム。 */
export function DescriptionList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
}

export function DescriptionItem({
  label,
  children,
  wide = false,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap text-ink-900">{children}</dd>
    </div>
  )
}

/** 数値を大きく見せる統計カード。 */
export function StatCard({
  label,
  value,
  tone = 'default',
  href,
}: {
  label: string
  value: number | string
  tone?: 'default' | 'highlight'
  href?: string
}) {
  const content = (
    <>
      <span className="text-xs text-ink-500">{label}</span>
      <span
        className={cn(
          'text-2xl font-bold tabular-nums',
          tone === 'highlight' ? 'text-brand-700' : 'text-ink-900',
        )}
      >
        {value}
      </span>
    </>
  )

  const className = cn(
    'flex min-h-20 flex-col justify-center gap-1 rounded-xl border p-3',
    tone === 'highlight' ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white',
  )

  if (href) {
    return (
      <a href={href} className={cn(className, 'transition-colors hover:border-brand-300')}>
        {content}
      </a>
    )
  }

  return <div className={className}>{content}</div>
}

/** ページ本文の共通コンテナ。 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('mx-auto w-full max-w-5xl px-4 py-5', className)}>{children}</div>
}

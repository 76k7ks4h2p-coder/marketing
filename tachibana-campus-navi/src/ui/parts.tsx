/** 画面全体で使う小さな部品 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Building, FacilityCategory, Source, VerificationStatus } from '../domain/types.ts'
import { cx, statusText } from './format.ts'
import {
  AlertIcon,
  BookIcon,
  BuildingIcon,
  BusIcon,
  CheckIcon,
  ClockIcon,
  ExternalIcon,
  GateIcon,
  InfoIcon,
  UsersIcon,
  UtensilsIcon,
} from './icons.tsx'

/** 建物番号のバッジ（H / J / 1 など）。番号がない建物はアイコン */
export function BuildingBadge({
  building,
  size = 'md',
}: {
  building: Building
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim =
    size === 'lg' ? 'size-12 text-xl' : size === 'sm' ? 'size-7 text-sm' : 'size-9 text-base'
  const academic = building.kind === 'academic'
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-bold',
        dim,
        academic ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-muted',
      )}
    >
      {building.code ?? <BuildingIcon size={size === 'lg' ? 22 : 16} />}
    </span>
  )
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const style =
    status === 'verified'
      ? 'bg-ok-soft text-ok'
      : status === 'pending'
        ? 'bg-warn-soft text-warn'
        : 'bg-danger-soft text-danger'
  const text = statusText(status)
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        style,
      )}
      title={text.description}
    >
      {status === 'verified' ? (
        <CheckIcon size={13} />
      ) : status === 'pending' ? (
        <ClockIcon size={13} />
      ) : (
        <AlertIcon size={13} />
      )}
      {text.label}
    </span>
  )
}

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: FacilityCategory
  size?: number
}) {
  switch (category) {
    case 'dining':
    case 'cafe':
      return <UtensilsIcon size={size} />
    case 'library':
      return <BookIcon size={size} />
    case 'commons':
      return <UsersIcon size={size} />
    case 'gate':
      return <GateIcon size={size} />
    case 'transport':
      return <BusIcon size={size} />
    default:
      return <InfoIcon size={size} />
  }
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'secondary',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors disabled:opacity-50',
        variant === 'primary' &&
          'bg-accent-fill text-on-accent hover:brightness-110 active:brightness-95',
        variant === 'secondary' && 'border border-line-strong bg-surface text-ink hover:bg-sunken',
        variant === 'ghost' && 'text-accent hover:bg-accent-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** 外部（大学公式サイト）へのリンク */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline',
        className,
      )}
    >
      {children}
      <ExternalIcon size={14} />
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  )
}

/** 出典の一覧（「どこに基づく情報か」を常に示す） */
export function SourceList({
  sources,
  notes,
  checkedAt,
}: {
  sources: Source[]
  notes?: (string | undefined)[]
  checkedAt?: string
}) {
  if (sources.length === 0) return null
  return (
    <div className="text-xs leading-relaxed text-muted">
      <p className="font-semibold">出典{checkedAt ? `（${checkedAt} 時点）` : ''}</p>
      <ul className="mt-1 space-y-1">
        {sources.map((s, i) => (
          <li key={s.id}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {s.title}
              </a>
            ) : (
              s.title
            )}
            {notes?.[i] ? `：${notes[i]}` : ''}
            {s.accessMethod === 'search-index' && '（原本未照合）'}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold tracking-wide text-muted">{children}</h3>
      {action}
    </div>
  )
}

/** アプリの外枠（ヘッダー・下部ナビゲーション・トースト） */
import type { ReactNode } from 'react'
import { cx } from './format.ts'
import { InfoIcon, MapIcon, SearchIcon, StarIcon } from './icons.tsx'

export type Tab = 'map' | 'search' | 'favorites'

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" className="fill-accent-fill" />
      <path
        d="M32 12c-8.3 0-15 6.5-15 14.6C17 37.5 32 52 32 52s15-14.5 15-25.4C47 18.5 40.3 12 32 12Z"
        fill="#fff"
      />
      <rect x="26" y="20" width="12" height="15" rx="1.5" className="fill-accent-fill" />
      <circle cx="35" cy="28" r="1.4" fill="#fff" />
    </svg>
  )
}

export function AppHeader({
  onAbout,
  children,
  className,
}: {
  onAbout(): void
  children?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cx(
        'shrink-0 bg-canvas px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <BrandMark />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-[17px] font-extrabold tracking-tight">
            Tachibana Campus Navi
          </h1>
          <p className="truncate text-xs text-muted">京都橘大学の教室ナビ・学生制作（非公式）</p>
        </div>
        <button
          type="button"
          onClick={onAbout}
          className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink"
          aria-label="このアプリについて・データの出典"
        >
          <InfoIcon size={22} />
        </button>
      </div>
      {children}
    </header>
  )
}

const TABS: { id: Tab; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'map', label: 'マップ', icon: () => <MapIcon size={22} /> },
  { id: 'search', label: '検索', icon: () => <SearchIcon size={22} /> },
  {
    id: 'favorites',
    label: 'お気に入り',
    icon: (active) => <StarIcon size={22} filled={active} />,
  },
]

export function BottomNav({ tab, onTab }: { tab: Tab; onTab(tab: Tab): void }) {
  return (
    <nav
      aria-label="メイン"
      className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-3">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold',
                  active ? 'text-accent' : 'text-muted',
                )}
              >
                {t.icon(active)}
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
    >
      {message && (
        <p className="max-w-md animate-fade-in rounded-2xl bg-ink px-4 py-3 text-sm font-semibold break-all text-canvas shadow-lg">
          {message}
        </p>
      )}
    </div>
  )
}

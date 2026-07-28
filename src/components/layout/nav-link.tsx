'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

import { cn } from '@/lib/cn'

export type NavItem = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** 完全一致でのみアクティブにする（一覧と新規作成を区別したい場合など）。 */
  exact?: boolean
}

function useIsActive(item: NavItem): boolean {
  const pathname = usePathname()
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** モバイル下部のタブナビゲーション用リンク。 */
export function MobileNavLink({ item }: { item: NavItem }) {
  const isActive = useIsActive(item)
  const { Icon } = item

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium',
        isActive ? 'text-brand-700' : 'text-ink-500',
      )}
    >
      <Icon aria-hidden className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  )
}

/** サイドバー用リンク。 */
export function SidebarNavLink({ item }: { item: NavItem }) {
  const isActive = useIsActive(item)
  const { Icon } = item

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
        isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-slate-100',
      )}
    >
      <Icon aria-hidden className="h-4.5 w-4.5" />
      <span>{item.label}</span>
    </Link>
  )
}

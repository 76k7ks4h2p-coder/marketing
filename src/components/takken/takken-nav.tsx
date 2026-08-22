'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

const ITEMS = [
  { href: '/takken', label: 'ホーム' },
  { href: '/takken/years', label: '年度別' },
  { href: '/takken/topics', label: '分野別' },
  { href: '/takken/mock', label: '模試' },
  { href: '/takken/review', label: '復習' },
  { href: '/takken/stats', label: '成績' },
] as const

export function TakkenNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="メニュー" className="border-t border-slate-100">
      <ul className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-2">
        {ITEMS.map((item) => {
          // ホームだけは完全一致。他は配下のページでも点灯させる。
          const active =
            item.href === '/takken'
              ? pathname === '/takken'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-900',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

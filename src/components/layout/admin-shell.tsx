import { ClipboardList, LayoutDashboard, Wrench } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { SERVICE_NAME } from '@/lib/constants/service'

import { LogoutForm } from './logout-form'
import { MobileNavLink, SidebarNavLink, type NavItem } from './nav-link'

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'ホーム', Icon: LayoutDashboard, exact: true },
  { href: '/admin/requests', label: '案件', Icon: ClipboardList },
  { href: '/admin/providers', label: '業者', Icon: Wrench },
]

/** 管理画面の共通レイアウト。 */
export function AdminShell({ children, userName }: { children: ReactNode; userName: string }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-800 bg-brand-900 text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="text-base font-bold">
            {SERVICE_NAME}
            <span className="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-xs font-medium">
              管理画面
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-sm text-white/80 sm:inline">{userName}</span>
            <LogoutForm className="[&_button]:text-white [&_button]:hover:bg-white/10" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-0 sm:px-4">
        <nav aria-label="管理メニュー" className="hidden w-52 shrink-0 py-5 lg:block">
          <ul className="sticky top-20 space-y-1">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</main>
      </div>

      <nav
        aria-label="管理メニュー（モバイル）"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-md">
          {ADMIN_NAV.map((item) => (
            <li key={item.href} className="flex flex-1">
              <MobileNavLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

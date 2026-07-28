import { Building2, ClipboardList, LayoutDashboard, UserRound } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { SERVICE_NAME } from '@/lib/constants/service'

import { LogoutForm } from './logout-form'
import { MobileNavLink, SidebarNavLink, type NavItem } from './nav-link'

const OWNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', Icon: LayoutDashboard, exact: true },
  { href: '/properties', label: '物件', Icon: Building2 },
  { href: '/requests', label: '依頼', Icon: ClipboardList },
  { href: '/profile', label: 'アカウント', Icon: UserRound },
]

/** オーナー向け画面の共通レイアウト。モバイルは下部タブ、広い画面は左サイドバー。 */
export function OwnerShell({ children, userName }: { children: ReactNode; userName: string }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-base font-bold text-brand-700">
            {SERVICE_NAME}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-sm text-ink-500 sm:inline">{userName} 様</span>
            <LogoutForm />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-0 sm:px-4">
        <nav aria-label="オーナーメニュー" className="hidden w-52 shrink-0 py-5 lg:block">
          <ul className="sticky top-20 space-y-1">
            {OWNER_NAV.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>

        {/* 下部タブの高さぶん余白を確保する */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</main>
      </div>

      <nav
        aria-label="オーナーメニュー（モバイル）"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-md">
          {OWNER_NAV.map((item) => (
            <li key={item.href} className="flex flex-1">
              <MobileNavLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

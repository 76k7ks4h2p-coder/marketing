import type { ReactNode } from 'react'

import { AdminShell } from '@/components/layout/admin-shell'
import { requireAdmin } from '@/lib/auth/session'

/**
 * 管理画面の共通レイアウト。
 *
 * owner がアクセスした場合はオーナーダッシュボードへリダイレクトし、
 * 「管理画面へのアクセス権限がありません」という日本語メッセージを表示する。
 * 各ページ・Server Action でも requireAdmin を通し、データ自体は RLS で保護する。
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, user } = await requireAdmin()

  const userName = profile.full_name ?? user.email ?? '運営管理者'

  return <AdminShell userName={userName}>{children}</AdminShell>
}

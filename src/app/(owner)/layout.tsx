import type { ReactNode } from 'react'

import { OwnerShell } from '@/components/layout/owner-shell'
import { requireOwner } from '@/lib/auth/session'

/**
 * オーナー画面の共通レイアウト。
 * 未ログインならログイン画面へ、admin なら管理画面へリダイレクトする。
 * 各ページ・Server Action でも権限を再確認し、データ自体は RLS で保護する。
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const { profile, user } = await requireOwner()

  const userName = profile.full_name ?? profile.organization_name ?? user.email ?? 'オーナー'

  return <OwnerShell userName={userName}>{children}</OwnerShell>
}

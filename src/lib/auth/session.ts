import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { AppError } from '@/lib/errors'
import { createSupabaseServerClient, type TypedSupabaseClient } from '@/lib/supabase/server'
import type { ProfileRow } from '@/lib/types/database'
import { isUserRole, type UserRole } from '@/lib/constants/roles'

export type SessionContext = {
  supabase: TypedSupabaseClient
  user: User
  profile: ProfileRow
  role: UserRole
}

/**
 * 現在のセッションを取得する。未ログインなら null。
 *
 * getUser() は Supabase Auth サーバーへ問い合わせてトークンを検証するため、
 * Cookie の中身をそのまま信用する getSession() より安全。
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, organization_name, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new AppError('アカウント情報の取得に失敗しました。時間をおいて再度お試しください。', {
      cause: profileError,
    })
  }

  if (!profile) {
    // profiles は auth.users のトリガーで作成されるため、通常ここには来ない。
    // 万一欠けている場合は、原因が分かる形で失敗させる。
    throw new AppError(
      'アカウント情報が見つかりませんでした。お手数ですが再度ログインしてください。',
    )
  }

  return {
    supabase,
    user,
    profile,
    role: isUserRole(profile.role) ? profile.role : 'owner',
  }
}

/** ログイン必須。未ログインならログイン画面へ。 */
export async function requireUser(redirectTo?: string): Promise<SessionContext> {
  const context = await getSessionContext()

  if (!context) {
    const params = new URLSearchParams({ reason: 'unauthenticated' })
    if (redirectTo) params.set('redirectTo', redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  return context
}

/** オーナー画面用。admin は自分のオーナー画面を持たないため管理画面へ送る。 */
export async function requireOwner(redirectTo?: string): Promise<SessionContext> {
  const context = await requireUser(redirectTo)

  if (context.role !== 'owner') {
    redirect('/admin')
  }

  return context
}

/** 管理画面用。owner はダッシュボードへ戻し、日本語メッセージを表示する。 */
export async function requireAdmin(): Promise<SessionContext> {
  const context = await requireUser('/admin')

  if (context.role !== 'admin') {
    redirect('/dashboard?denied=admin')
  }

  return context
}

/**
 * Server Action 用。リダイレクトではなく例外で権限不足を伝える。
 * （Server Action の中で redirect すると呼び出し側でエラー処理しづらいため）
 */
export async function requireAdminForAction(): Promise<SessionContext> {
  const context = await getSessionContext()

  if (!context) {
    throw new AppError('ログインの有効期限が切れました。もう一度ログインしてください。')
  }

  if (context.role !== 'admin') {
    throw new AppError('この操作を行う権限がありません。')
  }

  return context
}

/** Server Action 用のオーナー確認。 */
export async function requireOwnerForAction(): Promise<SessionContext> {
  const context = await getSessionContext()

  if (!context) {
    throw new AppError('ログインの有効期限が切れました。もう一度ログインしてください。')
  }

  if (context.role !== 'owner') {
    throw new AppError('この操作はオーナーアカウントでのみ実行できます。')
  }

  return context
}

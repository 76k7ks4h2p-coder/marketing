import { NextResponse, type NextRequest } from 'next/server'

import { logServerError } from '@/lib/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * 認証コールバック。
 *
 * メール確認・パスワード再設定・マジックリンクからの戻り先。
 * PKCE の code をセッションへ交換し、指定された画面へ遷移させる。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = sanitizeNext(searchParams.get('next'))

  // Supabase 側でエラーになった場合はそのまま案内ページへ
  const errorCode = searchParams.get('error') ?? searchParams.get('error_code')
  if (errorCode) {
    logServerError('auth/callback', {
      errorCode,
      description: searchParams.get('error_description'),
    })
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  try {
    const supabase = await createSupabaseServerClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        logServerError('auth/callback.exchangeCodeForSession', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    // メールリンクの形式によっては token_hash + type で届く
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
        token_hash: tokenHash,
      })
      if (error) {
        logServerError('auth/callback.verifyOtp', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  } catch (error) {
    logServerError('auth/callback', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

/** オープンリダイレクトを防ぐ。同一サイト内の絶対パスのみ許可する。 */
function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/lib/types/database'

import { readSupabaseEnvOrNull } from './env'

/** 未ログインではアクセスできないパス。 */
const PROTECTED_PREFIXES = ['/dashboard', '/properties', '/requests', '/profile', '/admin']

/** ログイン済みユーザーがアクセスしたらダッシュボードへ送るパス。 */
const AUTH_ONLY_PATHS = ['/login', '/signup', '/forgot-password']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.includes(pathname)
}

/**
 * 認証セッションを更新し、必要ならリダイレクトする。
 *
 * ここで行うのはあくまで「楽観的な」チェック。
 * 実際の認可（owner / admin の判定とデータアクセス）は
 * 各ページ・Server Action と Supabase の RLS で必ず再確認する。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const env = readSupabaseEnvOrNull()
  if (!env) {
    // 環境変数が未設定でもここでは落とさない。
    // 画面側で「設定が不足している」旨のエラーを表示する。
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
        // 認証 Cookie を含むレスポンスを CDN にキャッシュさせない
        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value)
        }
      },
    },
  })

  // トークンのリフレッシュはレスポンス生成前に済ませる必要がある
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`)
    loginUrl.searchParams.set('reason', 'unauthenticated')
    return withCookies(NextResponse.redirect(loginUrl), supabaseResponse)
  }

  if (user && isAuthOnlyPath(pathname)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    return withCookies(NextResponse.redirect(dashboardUrl), supabaseResponse)
  }

  return supabaseResponse
}

/** リダイレクト時にもセッション Cookie を確実に引き継ぐ。 */
function withCookies(target: NextResponse, source: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return target
}

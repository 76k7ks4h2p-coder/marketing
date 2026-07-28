import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js 16 の Proxy（旧 Middleware）。
 * Supabase の認証セッションを更新し、未ログインユーザーの保護ページへの
 * アクセスをログイン画面へ振り分ける。
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 静的アセットと画像最適化以外のすべてのパスにマッチさせる。
     * セッションのリフレッシュを取りこぼさないため、公開ページも通す。
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
}

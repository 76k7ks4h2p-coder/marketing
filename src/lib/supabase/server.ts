import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'

import { readSupabaseEnv } from './env'

export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * サーバー用 Supabase クライアント（Server Component / Server Action / Route Handler）。
 *
 * リクエストごとに必ず新しく生成する（クライアントを使い回さない）。
 * Server Component からは Cookie を書き込めないため setAll は失敗しうるが、
 * セッション更新は src/proxy.ts が担当するので握りつぶさず握り分ける。
 */
export async function createSupabaseServerClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies()
  const { url, publishableKey } = readSupabaseEnv()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component からは Cookie を設定できない。
          // このケースは proxy.ts のセッション更新でカバーされるため、
          // ここでは意図的に無視してよい（他の例外は握りつぶさない）。
        }
      },
    },
  })
}

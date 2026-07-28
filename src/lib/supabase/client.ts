'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'

import { readSupabaseEnv } from './env'

export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * ブラウザ用 Supabase クライアント。
 *
 * モジュール読み込み時ではなく呼び出し時に生成することで、
 * 環境変数が未設定でもページのビルド・レンダリング自体は失敗しないようにしている。
 * （createBrowserClient は内部でシングルトンを保持する）
 */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
  const { url, publishableKey } = readSupabaseEnv()
  return createBrowserClient<Database>(url, publishableKey)
}

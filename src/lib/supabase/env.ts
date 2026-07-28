/**
 * Supabase 接続に必要な公開環境変数の読み取り。
 *
 * - NEXT_PUBLIC_ 変数はビルド時にインライン展開されるため、
 *   `process.env.NEXT_PUBLIC_XXX` の形でリテラル参照する必要がある。
 * - 値そのもの（キー文字列）はログにも画面にも出さない。出すのは「変数名」だけ。
 */

export class MissingSupabaseEnvError extends Error {
  readonly missingKeys: string[]

  constructor(missingKeys: string[]) {
    super(
      `Supabase の環境変数が設定されていません: ${missingKeys.join(', ')}\n` +
        '.env.example をコピーして .env.local を作成し、値を設定してから開発サーバーを再起動してください。',
    )
    this.name = 'MissingSupabaseEnvError'
    this.missingKeys = missingKeys
  }
}

export type SupabaseEnv = {
  url: string
  publishableKey: string
}

/**
 * 設定されていれば環境変数を返し、不足していれば null を返す。
 * 起動を止めたくない場所（proxy など）で使う。
 */
export function readSupabaseEnvOrNull(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

/**
 * 環境変数を読み取る。不足していれば原因の分かる例外を投げる。
 * 例外メッセージにはキーの値を含めない。
 */
export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const missing: string[] = []
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!publishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  if (missing.length > 0 || !url || !publishableKey) {
    throw new MissingSupabaseEnvError(missing)
  }

  return { url, publishableKey }
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseEnvOrNull() !== null
}

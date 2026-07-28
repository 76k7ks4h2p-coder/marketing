import 'server-only'

import { headers } from 'next/headers'

/**
 * 認証メール内のリンクなどに使う、このサイトのオリジンを返す。
 *
 * NEXT_PUBLIC_SITE_URL が設定されていればそれを優先し、
 * 無ければリクエストヘッダーから組み立てる（プレビュー環境対応）。
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && configured.trim() !== '') {
    return configured.trim().replace(/\/$/, '')
  }

  const headerList = await headers()
  const forwardedHost = headerList.get('x-forwarded-host')
  const host = forwardedHost ?? headerList.get('host')
  const protocol =
    headerList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')

  if (!host) return 'http://localhost:3000'
  return `${protocol}://${host}`
}

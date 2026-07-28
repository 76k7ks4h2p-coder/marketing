import 'server-only'

import { Resend } from 'resend'

import { logServerError } from '@/lib/errors'

export type EmailMessage = {
  to: string
  subject: string
  text: string
}

type EmailConfig = {
  apiKey: string
  from: string
}

/**
 * Resend の設定を読み取る。
 * RESEND_API_KEY はサーバー専用。NEXT_PUBLIC_ を付けないこと。
 */
function readEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.NOTIFICATION_FROM_EMAIL

  if (!apiKey || !from) return null
  return { apiKey, from }
}

export function isEmailConfigured(): boolean {
  return readEmailConfig() !== null
}

export function getAdminNotificationEmail(): string | null {
  const value = process.env.ADMIN_NOTIFICATION_EMAIL
  return value && value.trim() !== '' ? value.trim() : null
}

let cachedClient: Resend | null = null

function getClient(apiKey: string): Resend {
  if (!cachedClient) {
    cachedClient = new Resend(apiKey)
  }
  return cachedClient
}

/**
 * メールを送信する。
 *
 * - Resend が未設定の場合は送信せず、開発ログへ内容を出力して成功扱いにする。
 * - 送信に失敗しても例外を投げない。呼び出し元（依頼登録・見積もり公開・
 *   見積もり選択・完了登録）の処理をメール送信の失敗で止めないため。
 */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const config = readEmailConfig()

  if (!config) {
    // 未設定でも失敗させない。開発時に内容を確認できるようログへ出す。
    console.info(
      [
        '[OwnerBase] メール通知はスキップされました（RESEND_API_KEY / NOTIFICATION_FROM_EMAIL が未設定）。',
        `  宛先: ${message.to}`,
        `  件名: ${message.subject}`,
        '  本文:',
        message.text
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n'),
      ].join('\n'),
    )
    return { sent: false }
  }

  try {
    const { error } = await getClient(config.apiKey).emails.send({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    })

    if (error) {
      logServerError('sendEmail', error)
      return { sent: false }
    }

    return { sent: true }
  } catch (error) {
    logServerError('sendEmail', error)
    return { sent: false }
  }
}

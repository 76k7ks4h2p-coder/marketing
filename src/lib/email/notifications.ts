import 'server-only'

import { serviceCategoryLabel } from '@/lib/constants/categories'
import { SERVICE_NAME } from '@/lib/constants/service'
import { formatYen } from '@/lib/format/currency'

import { getAdminNotificationEmail, sendEmail } from './client'

/**
 * メール本文には不要な個人情報を含めない。
 * 案件番号とカテゴリー、管理画面 / マイページへのリンクだけを載せ、
 * 詳細はログイン後に確認してもらう方針。
 */

function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && configured.trim() !== '') return configured.trim().replace(/\/$/, '')
  return 'http://localhost:3000'
}

function footer(): string {
  return ['', '---', `${SERVICE_NAME}（このメールは自動送信です）`].join('\n')
}

/** 1. 新規依頼作成時に管理者へ通知 */
export async function notifyAdminNewRequest(input: {
  requestNumber: string
  category: string
  requestId: string
}): Promise<void> {
  const to = getAdminNotificationEmail()
  if (!to) {
    console.info('[OwnerBase] ADMIN_NOTIFICATION_EMAIL が未設定のため管理者通知をスキップします。')
    return
  }

  await sendEmail({
    to,
    subject: `【${SERVICE_NAME}】新規依頼 ${input.requestNumber}`,
    text: [
      '新しい作業依頼が登録されました。',
      '',
      `案件番号: ${input.requestNumber}`,
      `カテゴリー: ${serviceCategoryLabel(input.category)}`,
      '',
      `管理画面で確認する: ${siteUrl()}/admin/requests/${input.requestId}`,
      footer(),
    ].join('\n'),
  })
}

/** 2. 見積もり公開時にオーナーへ通知 */
export async function notifyOwnerQuotePublished(input: {
  to: string
  requestNumber: string
  requestId: string
  publishedQuoteCount: number
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `【${SERVICE_NAME}】見積もりのご確認をお願いします（${input.requestNumber}）`,
    text: [
      'お世話になっております。',
      `ご依頼いただいた案件について、見積もりが ${input.publishedQuoteCount} 件そろいました。`,
      '',
      `案件番号: ${input.requestNumber}`,
      '',
      `内容を確認して業者を選ぶ: ${siteUrl()}/requests/${input.requestId}`,
      '',
      '※ 見積もりには有効期限があります。お早めにご確認ください。',
      footer(),
    ].join('\n'),
  })
}

/** 3. 見積もり選択時に管理者へ通知 */
export async function notifyAdminQuoteSelected(input: {
  requestNumber: string
  requestId: string
}): Promise<void> {
  const to = getAdminNotificationEmail()
  if (!to) {
    console.info('[OwnerBase] ADMIN_NOTIFICATION_EMAIL が未設定のため管理者通知をスキップします。')
    return
  }

  await sendEmail({
    to,
    subject: `【${SERVICE_NAME}】業者が選択されました（${input.requestNumber}）`,
    text: [
      'オーナーが見積もりを選択しました。日程調整を進めてください。',
      '',
      `案件番号: ${input.requestNumber}`,
      '',
      `管理画面で確認する: ${siteUrl()}/admin/requests/${input.requestId}`,
      footer(),
    ].join('\n'),
  })
}

/** 4. 作業完了時にオーナーへ通知 */
export async function notifyOwnerWorkCompleted(input: {
  to: string
  requestNumber: string
  requestId: string
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `【${SERVICE_NAME}】作業完了のご報告（${input.requestNumber}）`,
    text: [
      'お世話になっております。',
      'ご依頼いただいた作業が完了しました。完了報告と写真をご確認ください。',
      '',
      `案件番号: ${input.requestNumber}`,
      '',
      `完了報告を見る: ${siteUrl()}/requests/${input.requestId}`,
      footer(),
    ].join('\n'),
  })
}

/** 見積もり金額の要約（管理者向けログ用の補助。メール本文には金額を含めない）。 */
export function summarizeQuoteTotal(totalYen: number): string {
  return formatYen(totalYen)
}

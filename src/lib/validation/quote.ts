import { z } from 'zod'

import { QUOTE_PUBLICATION_STATUS_VALUES } from '@/lib/constants/quotes'

import {
  enumSchema,
  optionalDateSchema,
  optionalPositiveInt,
  optionalPositiveNumber,
  optionalText,
  optionalYen,
  requiredYen,
  uuidSchema,
} from './common'

export const quoteItemSchema = z.object({
  id: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.uuid().optional(),
  ),
  itemName: z
    .string({ error: '項目名を入力してください。' })
    .transform((value) => value.trim())
    .pipe(z.string().min(1, '項目名を入力してください。').max(200)),
  quantity: optionalPositiveNumber('数量', 1_000_000),
  unit: optionalText('単位', 20),
  unitPriceYen: optionalYen('単価'),
  amountYen: requiredYen('金額'),
  notes: optionalText('明細の備考', 500),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
})

export type QuoteItemInput = z.output<typeof quoteItemSchema>

export const quoteSchema = z
  .object({
    requestId: uuidSchema('対象案件'),
    providerId: uuidSchema('業者'),
    quoteNumber: optionalText('見積番号', 50),
    quoteDate: optionalDateSchema('見積作成日'),
    validUntil: optionalDateSchema('見積有効期限'),
    availableDate: optionalDateSchema('対応可能日'),
    estimatedWorkDays: optionalPositiveInt('作業日数', 365),
    subtotalYen: optionalYen('税抜金額'),
    taxYen: optionalYen('消費税額'),
    // 業者から税込総額しか提示されていない場合でも登録できるよう、必須は総額のみ。
    totalYen: requiredYen('税込総額'),
    includedScope: optionalText('作業に含まれる内容', 2000),
    excludedScope: optionalText('作業に含まれない内容', 2000),
    additionalChargeConditions: optionalText('追加料金条件', 2000),
    warranty: optionalText('保証内容', 2000),
    adminComment: optionalText('運営者コメント', 2000),
    publicationStatus: enumSchema(QUOTE_PUBLICATION_STATUS_VALUES, '公開状態'),
    items: z.array(quoteItemSchema).max(50, '明細は 50 件までです。').default([]),
    /** 明細合計と税込総額の不一致を承知のうえで保存する場合に true。 */
    acknowledgeTotalMismatch: z.preprocess(
      (value) => value === 'on' || value === 'true' || value === true,
      z.boolean(),
    ),
  })
  .refine(
    (value) =>
      value.validUntil === undefined ||
      value.quoteDate === undefined ||
      value.validUntil >= value.quoteDate,
    {
      message: '見積有効期限は見積作成日以降の日付を指定してください。',
      path: ['validUntil'],
    },
  )

export type QuoteInput = z.output<typeof quoteSchema>

/** 明細の金額合計。 */
export function sumQuoteItems(items: readonly { amountYen: number }[]): number {
  return items.reduce((total, item) => total + item.amountYen, 0)
}

/**
 * 明細合計と税込総額が一致しているか。
 * 端数処理や「一式」見積もりがあるため、これは保存を止める条件ではなく警告の判定に使う。
 */
export function hasTotalMismatch(
  items: readonly { amountYen: number }[],
  totalYen: number,
): boolean {
  if (items.length === 0) return false
  return sumQuoteItems(items) !== totalYen
}

export function totalMismatchMessage(
  items: readonly { amountYen: number }[],
  totalYen: number,
): string {
  const itemTotal = sumQuoteItems(items)
  const diff = totalYen - itemTotal
  const sign = diff > 0 ? '不足' : '超過'
  return (
    `見積明細の合計（${itemTotal.toLocaleString('ja-JP')}円）と税込総額（${totalYen.toLocaleString('ja-JP')}円）が一致していません。` +
    `明細側が${Math.abs(diff).toLocaleString('ja-JP')}円${sign}しています。` +
    '端数調整や一式見積もりで意図的な差異であれば、そのまま保存できます。'
  )
}

/** 見積もりの公開状態変更。 */
export const quotePublicationSchema = z.object({
  quoteId: uuidSchema('見積もり'),
  publicationStatus: enumSchema(QUOTE_PUBLICATION_STATUS_VALUES, '公開状態'),
  /** 公開と同時に案件ステータスを quotes_ready へ変更するか。 */
  moveRequestToQuotesReady: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.boolean(),
  ),
})

/** オーナーによる見積もり選択。owner_id は受け取らない（サーバー側で auth.uid() を使う）。 */
export const selectQuoteSchema = z.object({
  requestId: uuidSchema('案件'),
  quoteId: uuidSchema('見積もり'),
})

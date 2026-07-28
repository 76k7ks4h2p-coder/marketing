import { z } from 'zod'

import { SERVICE_CATEGORY_VALUES } from '@/lib/constants/categories'
import { REQUEST_STATUS_VALUES } from '@/lib/constants/statuses'
import { URGENCY_VALUES } from '@/lib/constants/urgency'

import { enumSchema, optionalText, optionalYen, requiredText, uuidSchema } from './common'

/** 予算下限と予算上限の整合を検証する共通ルール。 */
export function isBudgetRangeValid(
  min: number | null | undefined,
  max: number | null | undefined,
): boolean {
  if (min === null || min === undefined) return true
  if (max === null || max === undefined) return true
  return min <= max
}

export const BUDGET_RANGE_ERROR = '予算下限は予算上限以下で入力してください。'

/** ステップ 1: 対象物件・カテゴリー・対象箇所・緊急度 */
export const requestStep1Schema = z.object({
  propertyId: uuidSchema('対象物件'),
  category: enumSchema(SERVICE_CATEGORY_VALUES, '作業カテゴリー'),
  targetLocation: optionalText('対象箇所・部屋番号', 100),
  urgency: enumSchema(URGENCY_VALUES, '緊急度'),
})

/** ステップ 2: 依頼内容 */
export const requestStep2Schema = z
  .object({
    title: requiredText('依頼タイトル', 100),
    description: requiredText('詳細', 4000),
    preferredTiming: optionalText('希望時期', 100),
    budgetMinYen: optionalYen('予算下限'),
    budgetMaxYen: optionalYen('予算上限'),
    additionalNotes: optionalText('補足事項', 2000),
  })
  .refine((value) => isBudgetRangeValid(value.budgetMinYen, value.budgetMaxYen), {
    message: BUDGET_RANGE_ERROR,
    path: ['budgetMaxYen'],
  })

/** 送信時にサーバー側で検証する全体スキーマ。 */
export const serviceRequestSchema = z
  .object({
    propertyId: uuidSchema('対象物件'),
    category: enumSchema(SERVICE_CATEGORY_VALUES, '作業カテゴリー'),
    targetLocation: optionalText('対象箇所・部屋番号', 100),
    urgency: enumSchema(URGENCY_VALUES, '緊急度'),
    title: requiredText('依頼タイトル', 100),
    description: requiredText('詳細', 4000),
    preferredTiming: optionalText('希望時期', 100),
    budgetMinYen: optionalYen('予算下限'),
    budgetMaxYen: optionalYen('予算上限'),
    additionalNotes: optionalText('補足事項', 2000),
  })
  .refine((value) => isBudgetRangeValid(value.budgetMinYen, value.budgetMaxYen), {
    message: BUDGET_RANGE_ERROR,
    path: ['budgetMaxYen'],
  })

export type ServiceRequestInput = z.output<typeof serviceRequestSchema>

/** 管理者によるステータス変更。 */
export const updateRequestStatusSchema = z.object({
  requestId: uuidSchema('案件'),
  status: enumSchema(REQUEST_STATUS_VALUES, 'ステータス'),
})

/** 管理者メモの更新。 */
export const updateAdminNotesSchema = z.object({
  requestId: uuidSchema('案件'),
  adminNotes: optionalText('管理者メモ', 4000),
})

/** 完了報告の登録。 */
export const workReportSchema = z.object({
  requestId: uuidSchema('案件'),
  completionSummary: requiredText('完了内容', 4000),
  completedAt: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '完了日は日付を選択してください。')
      .optional(),
  ),
  markCompleted: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.boolean(),
  ),
})

export type WorkReportInput = z.output<typeof workReportSchema>

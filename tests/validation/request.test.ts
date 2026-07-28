import { describe, expect, it } from 'vitest'

import {
  BUDGET_RANGE_ERROR,
  isBudgetRangeValid,
  serviceRequestSchema,
} from '@/lib/validation/request'

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111'

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: PROPERTY_ID,
    category: 'vacant_cleaning',
    urgency: 'normal',
    title: '201号室の退去後クリーニング',
    description: '退去に伴う原状回復クリーニングをお願いしたいです。',
    ...overrides,
  }
}

describe('isBudgetRangeValid', () => {
  it('下限 <= 上限なら有効', () => {
    expect(isBudgetRangeValid(30000, 50000)).toBe(true)
  })

  it('下限 == 上限なら有効', () => {
    expect(isBudgetRangeValid(50000, 50000)).toBe(true)
  })

  it('下限 > 上限なら無効', () => {
    expect(isBudgetRangeValid(60000, 50000)).toBe(false)
  })

  it('どちらか未設定なら有効として扱う', () => {
    expect(isBudgetRangeValid(null, 50000)).toBe(true)
    expect(isBudgetRangeValid(30000, null)).toBe(true)
    expect(isBudgetRangeValid(null, null)).toBe(true)
    expect(isBudgetRangeValid(undefined, undefined)).toBe(true)
  })
})

describe('依頼スキーマの予算検証', () => {
  it('予算下限が予算上限以下なら送信できる', () => {
    const result = serviceRequestSchema.safeParse(
      validInput({ budgetMinYen: '30000', budgetMaxYen: '50000' }),
    )
    expect(result.success).toBe(true)
  })

  it('予算下限が予算上限を超える場合は送信できない', () => {
    const result = serviceRequestSchema.safeParse(
      validInput({ budgetMinYen: '60000', budgetMaxYen: '50000' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      expect(messages).toContain(BUDGET_RANGE_ERROR)
      // エラーは予算上限のフィールドに紐づける
      expect(result.error.issues.some((issue) => issue.path.includes('budgetMaxYen'))).toBe(true)
    }
  })

  it('予算が未入力でも送信できる', () => {
    const result = serviceRequestSchema.safeParse(
      validInput({ budgetMinYen: '', budgetMaxYen: '' }),
    )
    expect(result.success).toBe(true)
  })

  it('負の金額は拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ budgetMinYen: '-1' })).success).toBe(false)
  })

  it('小数の金額は拒否する（1 円単位の整数のみ）', () => {
    expect(serviceRequestSchema.safeParse(validInput({ budgetMaxYen: '100.5' })).success).toBe(
      false,
    )
  })
})

describe('依頼スキーマの必須項目', () => {
  it('物件 ID が UUID でない場合は拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ propertyId: 'abc' })).success).toBe(false)
  })

  it('存在しないカテゴリーは拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ category: 'painting' })).success).toBe(false)
  })

  it('存在しない緊急度は拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ urgency: 'asap' })).success).toBe(false)
  })

  it('タイトルが空の場合は拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ title: '  ' })).success).toBe(false)
  })

  it('詳細が空の場合は拒否する', () => {
    expect(serviceRequestSchema.safeParse(validInput({ description: '' })).success).toBe(false)
  })

  it('前後の空白は除去される', () => {
    const result = serviceRequestSchema.safeParse(validInput({ title: '  清掃依頼  ' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('清掃依頼')
  })
})

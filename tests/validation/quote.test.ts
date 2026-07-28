import { describe, expect, it } from 'vitest'

import {
  hasTotalMismatch,
  quoteSchema,
  sumQuoteItems,
  totalMismatchMessage,
} from '@/lib/validation/quote'

const REQUEST_ID = '11111111-1111-4111-8111-111111111111'
const PROVIDER_ID = '22222222-2222-4222-8222-222222222222'

function validQuote(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    providerId: PROVIDER_ID,
    totalYen: '55000',
    publicationStatus: 'draft',
    items: [],
    acknowledgeTotalMismatch: '',
    ...overrides,
  }
}

describe('見積明細の合計', () => {
  it('明細の金額を合計する', () => {
    expect(sumQuoteItems([{ amountYen: 30000 }, { amountYen: 25000 }])).toBe(55000)
  })

  it('明細が無い場合は 0', () => {
    expect(sumQuoteItems([])).toBe(0)
  })
})

describe('明細合計と税込総額の不一致検出', () => {
  it('一致していれば警告しない', () => {
    expect(hasTotalMismatch([{ amountYen: 30000 }, { amountYen: 25000 }], 55000)).toBe(false)
  })

  it('一致していなければ警告する', () => {
    expect(hasTotalMismatch([{ amountYen: 30000 }], 55000)).toBe(true)
  })

  it('明細が無い場合（一式見積もり）は警告しない', () => {
    expect(hasTotalMismatch([], 55000)).toBe(false)
  })

  it('警告メッセージに両方の金額と差額が含まれる', () => {
    const message = totalMismatchMessage([{ amountYen: 30000 }], 55000)
    expect(message).toContain('30,000')
    expect(message).toContain('55,000')
    expect(message).toContain('25,000')
    // 保存を続行できることを伝える
    expect(message).toContain('保存できます')
  })
})

describe('見積もりスキーマ', () => {
  it('税込総額だけでも登録できる（業者が総額しか提示しない場合）', () => {
    const result = quoteSchema.safeParse(validQuote())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalYen).toBe(55000)
      expect(result.data.subtotalYen).toBeUndefined()
      expect(result.data.taxYen).toBeUndefined()
    }
  })

  it('税込総額が未入力なら拒否する', () => {
    expect(quoteSchema.safeParse(validQuote({ totalYen: '' })).success).toBe(false)
  })

  it('金額が負なら拒否する', () => {
    expect(quoteSchema.safeParse(validQuote({ totalYen: '-1' })).success).toBe(false)
  })

  it('金額が小数なら拒否する（1 円単位の整数のみ）', () => {
    expect(quoteSchema.safeParse(validQuote({ totalYen: '100.5' })).success).toBe(false)
  })

  it('0 円の見積もりは許容する', () => {
    expect(quoteSchema.safeParse(validQuote({ totalYen: '0' })).success).toBe(true)
  })

  it('見積有効期限が見積作成日より前なら拒否する', () => {
    const result = quoteSchema.safeParse(
      validQuote({ quoteDate: '2026-07-28', validUntil: '2026-07-01' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('validUntil'))).toBe(true)
    }
  })

  it('見積有効期限が見積作成日以降なら通す', () => {
    const result = quoteSchema.safeParse(
      validQuote({ quoteDate: '2026-07-28', validUntil: '2026-08-31' }),
    )
    expect(result.success).toBe(true)
  })

  it('対応可能日は日付形式のみ受け付ける', () => {
    expect(quoteSchema.safeParse(validQuote({ availableDate: '2026-08-01' })).success).toBe(true)
    expect(quoteSchema.safeParse(validQuote({ availableDate: '８月１日' })).success).toBe(false)
  })

  it('作業日数は正の整数のみ受け付ける', () => {
    expect(quoteSchema.safeParse(validQuote({ estimatedWorkDays: '2' })).success).toBe(true)
    expect(quoteSchema.safeParse(validQuote({ estimatedWorkDays: '0' })).success).toBe(false)
    expect(quoteSchema.safeParse(validQuote({ estimatedWorkDays: '-1' })).success).toBe(false)
  })

  it('存在しない公開状態は拒否する', () => {
    expect(quoteSchema.safeParse(validQuote({ publicationStatus: 'archived' })).success).toBe(false)
  })

  it('明細を含めて検証できる', () => {
    const result = quoteSchema.safeParse(
      validQuote({
        items: [
          {
            itemName: '室内クリーニング',
            quantity: '1',
            unit: '式',
            unitPriceYen: '50000',
            amountYen: '50000',
            sortOrder: 0,
          },
          {
            itemName: 'エアコン洗浄',
            quantity: '1',
            unit: '台',
            unitPriceYen: '5000',
            amountYen: '5000',
            sortOrder: 1,
          },
        ],
      }),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(2)
      expect(sumQuoteItems(result.data.items.map((item) => ({ amountYen: item.amountYen })))).toBe(
        55000,
      )
    }
  })

  it('明細の項目名が空なら拒否する', () => {
    const result = quoteSchema.safeParse(
      validQuote({ items: [{ itemName: '  ', amountYen: '1000', sortOrder: 0 }] }),
    )
    expect(result.success).toBe(false)
  })
})

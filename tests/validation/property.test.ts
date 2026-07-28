import { describe, expect, it } from 'vitest'

import { MIN_BUILT_YEAR } from '@/lib/constants/properties'
import { SERVICE_AREA } from '@/lib/constants/service'
import { maxBuiltYear, propertySchema } from '@/lib/validation/property'

/** 有効な入力の雛形。テストごとに一部だけ差し替える。 */
function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'テストハイツ',
    postalCode: '720-0001',
    prefecture: SERVICE_AREA.prefecture,
    city: SERVICE_AREA.city,
    addressLine1: '１丁目２番３号',
    propertyType: 'apartment_building',
    ...overrides,
  }
}

describe('物件の対応エリア制限', () => {
  it('広島県福山市の物件は登録できる', () => {
    const result = propertySchema.safeParse(validInput())
    expect(result.success).toBe(true)
  })

  it('福山市以外の市区町村は拒否する', () => {
    const result = propertySchema.safeParse(validInput({ city: '広島市' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(' ')
      expect(message).toContain('福山市')
    }
  })

  it('広島県以外の都道府県は拒否する', () => {
    const result = propertySchema.safeParse(
      validInput({ prefecture: '岡山県', city: SERVICE_AREA.city }),
    )
    expect(result.success).toBe(false)
  })

  it('都道府県・市区町村がどちらもエリア外の場合も拒否する', () => {
    const result = propertySchema.safeParse(validInput({ prefecture: '東京都', city: '渋谷区' }))
    expect(result.success).toBe(false)
  })
})

describe('郵便番号', () => {
  it('ハイフンありを受け付ける', () => {
    const result = propertySchema.safeParse(validInput({ postalCode: '720-0001' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.postalCode).toBe('720-0001')
  })

  it('ハイフンなしを受け付けて正規化する', () => {
    const result = propertySchema.safeParse(validInput({ postalCode: '7200001' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.postalCode).toBe('720-0001')
  })

  it('桁数が足りない場合は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ postalCode: '720' })).success).toBe(false)
  })

  it('数字以外を含む場合は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ postalCode: 'ABC-DEFG' })).success).toBe(false)
  })
})

describe('築年の妥当性', () => {
  it('妥当な西暦は受け付ける', () => {
    const result = propertySchema.safeParse(validInput({ builtYear: '1995' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.builtYear).toBe(1995)
  })

  it('翌年までは許容する（新築計画中）', () => {
    const result = propertySchema.safeParse(validInput({ builtYear: String(maxBuiltYear()) }))
    expect(result.success).toBe(true)
  })

  it('2 年以上先の未来は拒否する', () => {
    const result = propertySchema.safeParse(validInput({ builtYear: String(maxBuiltYear() + 1) }))
    expect(result.success).toBe(false)
  })

  it('下限より古い年は拒否する', () => {
    const result = propertySchema.safeParse(validInput({ builtYear: String(MIN_BUILT_YEAR - 1) }))
    expect(result.success).toBe(false)
  })

  it('未入力は許容する（任意項目）', () => {
    const result = propertySchema.safeParse(validInput({ builtYear: '' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.builtYear).toBeUndefined()
  })
})

describe('戸数', () => {
  it('正の整数を受け付ける', () => {
    const result = propertySchema.safeParse(validInput({ unitCount: '8' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.unitCount).toBe(8)
  })

  it('0 は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ unitCount: '0' })).success).toBe(false)
  })

  it('負の数は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ unitCount: '-1' })).success).toBe(false)
  })

  it('小数は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ unitCount: '1.5' })).success).toBe(false)
  })
})

describe('面積', () => {
  it('0 より大きい値を受け付ける', () => {
    const result = propertySchema.safeParse(validInput({ areaSqm: '62.5' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.areaSqm).toBe(62.5)
  })

  it('0 は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ areaSqm: '0' })).success).toBe(false)
  })

  it('負の値は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ areaSqm: '-10' })).success).toBe(false)
  })
})

describe('必須項目', () => {
  it('物件名が空の場合は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ name: '   ' })).success).toBe(false)
  })

  it('町名・番地が空の場合は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ addressLine1: '' })).success).toBe(false)
  })

  it('物件種別が未選択の場合は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ propertyType: '' })).success).toBe(false)
  })

  it('存在しない物件種別は拒否する', () => {
    expect(propertySchema.safeParse(validInput({ propertyType: 'castle' })).success).toBe(false)
  })
})

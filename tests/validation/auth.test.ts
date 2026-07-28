import { describe, expect, it } from 'vitest'

import {
  PASSWORD_MIN_LENGTH,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/validation/auth'

function validSignup(overrides: Record<string, unknown> = {}) {
  return {
    email: 'owner@example.com',
    password: 'password1234',
    passwordConfirm: 'password1234',
    fullName: '福山 太郎',
    agreeToTerms: 'on',
    ...overrides,
  }
}

describe('メールアドレス形式', () => {
  it('正しい形式を受け付ける', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true)
  })

  it('@ が無い場合は拒否する', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })

  it('ドメインが不正な場合は拒否する', () => {
    expect(loginSchema.safeParse({ email: 'a@b', password: 'x' }).success).toBe(false)
  })

  it('前後の空白は除去して判定する', () => {
    const result = loginSchema.safeParse({ email: '  a@example.com  ', password: 'x' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('a@example.com')
  })
})

describe('パスワード長', () => {
  it(`${PASSWORD_MIN_LENGTH} 文字以上なら通る`, () => {
    expect(signupSchema.safeParse(validSignup()).success).toBe(true)
  })

  it(`${PASSWORD_MIN_LENGTH} 文字未満は拒否する`, () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    const result = signupSchema.safeParse(validSignup({ password: short, passwordConfirm: short }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('文字以上'))).toBe(true)
    }
  })

  it('確認用パスワードが一致しない場合は拒否する', () => {
    const result = signupSchema.safeParse(validSignup({ passwordConfirm: 'different1234' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('passwordConfirm'))).toBe(true)
    }
  })

  it('再設定フォームでも一致を検証する', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'password1234', passwordConfirm: 'password1234' })
        .success,
    ).toBe(true)
    expect(
      resetPasswordSchema.safeParse({ password: 'password1234', passwordConfirm: 'nope12345' })
        .success,
    ).toBe(false)
  })
})

describe('利用規約への同意', () => {
  it('同意していない場合は登録できない', () => {
    const result = signupSchema.safeParse(validSignup({ agreeToTerms: undefined }))
    expect(result.success).toBe(false)
  })
})

describe('電話番号の長さ', () => {
  it('妥当な番号を受け付ける', () => {
    expect(profileSchema.safeParse({ fullName: '福山 太郎', phone: '084-000-0000' }).success).toBe(
      true,
    )
    expect(profileSchema.safeParse({ fullName: '福山 太郎', phone: '09000000000' }).success).toBe(
      true,
    )
  })

  it('桁数が足りない番号は拒否する', () => {
    expect(profileSchema.safeParse({ fullName: '福山 太郎', phone: '12345' }).success).toBe(false)
  })

  it('桁数が多すぎる番号は拒否する', () => {
    expect(
      profileSchema.safeParse({ fullName: '福山 太郎', phone: '0123456789012345678' }).success,
    ).toBe(false)
  })

  it('数字以外を含む番号は拒否する', () => {
    expect(profileSchema.safeParse({ fullName: '福山 太郎', phone: '090-ABCD-EFGH' }).success).toBe(
      false,
    )
  })

  it('未入力は許容する（任意項目）', () => {
    const result = profileSchema.safeParse({ fullName: '福山 太郎', phone: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBeUndefined()
  })
})

describe('必須項目', () => {
  it('お名前が空の場合は拒否する', () => {
    expect(profileSchema.safeParse({ fullName: '   ' }).success).toBe(false)
  })
})

import { z } from 'zod'

import { emailSchema, optionalPhoneSchema, optionalText, requiredText } from './common'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72 // Supabase Auth（bcrypt）の上限

export const passwordSchema = z
  .string({ error: 'パスワードを入力してください。' })
  .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`)
  .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください。`)

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string({ error: 'パスワード（確認）を入力してください。' }),
    fullName: requiredText('お名前', 100),
    phone: optionalPhoneSchema,
    organizationName: optionalText('会社名・屋号', 100),
    agreeToTerms: z
      .union([z.literal('on'), z.literal('true'), z.boolean()])
      .refine((value) => value === 'on' || value === 'true' || value === true, {
        message: '利用規約とプライバシーポリシーへの同意が必要です。',
      }),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: 'パスワードが一致しません。',
    path: ['passwordConfirm'],
  })

export type SignupInput = z.output<typeof signupSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'パスワードを入力してください。' })
    .min(1, 'パスワードを入力してください。'),
})

export type LoginInput = z.output<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string({ error: 'パスワード（確認）を入力してください。' }),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: 'パスワードが一致しません。',
    path: ['passwordConfirm'],
  })

export type ResetPasswordInput = z.output<typeof resetPasswordSchema>

export const profileSchema = z.object({
  fullName: requiredText('お名前', 100),
  phone: optionalPhoneSchema,
  organizationName: optionalText('会社名・屋号', 100),
})

export type ProfileInput = z.output<typeof profileSchema>

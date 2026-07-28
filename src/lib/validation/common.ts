import { z } from 'zod'

/**
 * 共通の検証部品。
 * クライアントとサーバーで同じスキーマを使うため、ここには
 * ブラウザ専用 API / Node 専用 API を持ち込まないこと。
 */

/** 空文字・空白のみを undefined として扱う（HTML フォームの未入力対策）。 */
export function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** 必須のテキスト。前後の空白は除去する。 */
export function requiredText(label: string, max = 200) {
  return z
    .string({ error: `${label}を入力してください。` })
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, `${label}を入力してください。`)
        .max(max, `${label}は${max}文字以内で入力してください。`),
    )
}

/** 任意のテキスト。未入力は undefined になる。 */
export function optionalText(label: string, max = 200) {
  return z.preprocess(
    emptyToUndefined,
    z.string().max(max, `${label}は${max}文字以内で入力してください。`).optional(),
  )
}

/** 任意の 0 以上の整数（円）。 */
export function optionalYen(label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}は数値で入力してください。` })
      .int(`${label}は 1 円単位の整数で入力してください。`)
      .min(0, `${label}は 0 以上で入力してください。`)
      .max(1_000_000_000, `${label}が大きすぎます。`)
      .optional(),
  )
}

/**
 * 必須の 0 以上の整数（円）。
 *
 * 注意: z.coerce.number() は空文字を 0 に変換してしまうため、
 * 未入力を 0 円として通さないよう、先に undefined へ正規化してから検証する。
 */
export function requiredYen(label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}を数値で入力してください。` })
      .int(`${label}は 1 円単位の整数で入力してください。`)
      .min(0, `${label}は 0 以上で入力してください。`)
      .max(1_000_000_000, `${label}が大きすぎます。`),
  )
}

/** 任意の正の整数。 */
export function optionalPositiveInt(label: string, max = 100_000) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}は数値で入力してください。` })
      .int(`${label}は整数で入力してください。`)
      .positive(`${label}は 1 以上で入力してください。`)
      .max(max, `${label}が大きすぎます。`)
      .optional(),
  )
}

/** 任意の正の小数（面積・数量など）。 */
export function optionalPositiveNumber(label: string, max = 1_000_000) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}は数値で入力してください。` })
      .positive(`${label}は 0 より大きい値を入力してください。`)
      .max(max, `${label}が大きすぎます。`)
      .optional(),
  )
}

/** 郵便番号。"1234567" と "123-4567" を受け付け、"123-4567" に正規化する。 */
export const postalCodeSchema = z
  .string({ error: '郵便番号を入力してください。' })
  .transform((value) => value.trim().replace(/[　\s]/g, ''))
  .refine((value) => /^\d{3}-?\d{4}$/.test(value), {
    message: '郵便番号は 7 桁の数字で入力してください（例: 720-0001）。',
  })
  .transform((value) => (value.includes('-') ? value : `${value.slice(0, 3)}-${value.slice(3)}`))

/** 電話番号。数字・ハイフン・＋・括弧のみを許可し、長さを 10〜20 文字に制限する。 */
export const phoneSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => /^[0-9+\-()\s]+$/.test(value), {
    message: '電話番号は数字とハイフンで入力してください。',
  })
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 15
    },
    { message: '電話番号の桁数が正しくありません（10〜15 桁）。' },
  )
  .refine((value) => value.length >= 10 && value.length <= 20, {
    message: '電話番号は 10〜20 文字で入力してください。',
  })

export const optionalPhoneSchema = z.preprocess(emptyToUndefined, phoneSchema.optional())

/** メールアドレス。 */
export const emailSchema = z
  .string({ error: 'メールアドレスを入力してください。' })
  .transform((value) => value.trim())
  .pipe(z.email('メールアドレスの形式が正しくありません。').max(254))

export const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z.email('メールアドレスの形式が正しくありません。').max(254).optional(),
)

/** 日付（YYYY-MM-DD）。 */
export function optionalDateSchema(label: string) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}は日付を選択してください。`)
      .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), {
        message: `${label}が正しい日付ではありません。`,
      })
      .optional(),
  )
}

/** UUID。 */
export function uuidSchema(label: string) {
  return z.uuid(`${label}の指定が正しくありません。`)
}

/** 列挙値。 */
export function enumSchema<T extends readonly [string, ...string[]]>(values: T, label: string) {
  return z.enum(values, { error: `${label}を選択してください。` })
}

/**
 * FormData をプレーンなオブジェクトへ変換する。
 * 同じ name が複数ある場合は配列にまとめる。
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue
    const existing = result[key]
    if (existing === undefined) {
      result[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      result[key] = [existing, value]
    }
  }

  return result
}

/** FormData から同名の値をすべて配列で取り出す（チェックボックス用）。 */
export function formDataAll(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
}

export type FieldErrorMap = Record<string, string[]>

/**
 * Zod のエラーをフォームのフィールドエラー形式へ変換する。
 * ネストしたパス（例: items.0.amountYen）はドット区切りのキーにする。
 * パスを持たないエラーは `_form` へまとめる。
 */
export function toFieldErrors(error: z.ZodError): FieldErrorMap {
  const fieldErrors: FieldErrorMap = {}
  const formErrors: string[] = []

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formErrors.push(issue.message)
      continue
    }

    const key = issue.path.map((segment) => String(segment)).join('.')
    const existing = fieldErrors[key]
    if (existing) existing.push(issue.message)
    else fieldErrors[key] = [issue.message]
  }

  if (formErrors.length > 0) {
    fieldErrors._form = formErrors
  }

  return fieldErrors
}

/** フィールドエラーから、フォーム全体に表示する 1 行のメッセージを作る。 */
export function firstErrorMessage(
  fieldErrors: FieldErrorMap,
  fallback = '入力内容をご確認ください。',
): string {
  const formError = fieldErrors._form?.[0]
  if (formError) return formError

  for (const messages of Object.values(fieldErrors)) {
    if (messages.length > 0) return messages[0]
  }

  return fallback
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result'
import { getSessionContext } from '@/lib/auth/session'
import { AppError, handleError } from '@/lib/errors'
import { getSiteOrigin } from '@/lib/site-url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MissingSupabaseEnvError } from '@/lib/supabase/env'
import { firstErrorMessage, formDataToObject, toFieldErrors } from '@/lib/validation/common'
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/validation/auth'

const SETUP_ERROR_MESSAGE =
  'サーバーの設定が完了していないため処理できません。管理者へお問い合わせください。'

/** 環境変数未設定を、秘密情報を出さずに利用者向けメッセージへ変換する。 */
function toSetupSafeMessage(context: string, error: unknown): string {
  if (error instanceof MissingSupabaseEnvError) {
    // 変数名のみをサーバーログへ。画面には設定不足である旨だけを出す。
    console.error(`[OwnerBase] ${context}: ${error.message}`)
    return SETUP_ERROR_MESSAGE
  }
  return handleError(context, error)
}

// -----------------------------------------------------------------------------
// 新規登録
// -----------------------------------------------------------------------------

export type SignupResult = ActionResult<{ needsEmailConfirmation: boolean }>

export async function signUpAction(
  _prevState: SignupResult | null,
  formData: FormData,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const input = parsed.data

  try {
    const supabase = await createSupabaseServerClient()
    const origin = await getSiteOrigin()

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        // profiles は auth.users のトリガーが作成する。role は常に owner で固定。
        data: {
          full_name: input.fullName,
          phone: input.phone ?? '',
          organization_name: input.organizationName ?? '',
        },
      },
    })

    if (error) {
      // メールアドレス重複などは Supabase 側のメッセージをそのまま出さない
      console.error('[OwnerBase] signUp', error)
      if (error.status === 422 || error.code === 'user_already_exists') {
        return actionFailure(
          'このメールアドレスは登録できませんでした。すでに登録済みの場合はログインしてください。',
        )
      }
      return actionFailure('アカウントの作成に失敗しました。時間をおいて再度お試しください。')
    }

    // メール確認が有効な場合は session が返らない
    const needsEmailConfirmation = data.session === null

    if (!needsEmailConfirmation) {
      revalidatePath('/', 'layout')
    }

    return actionSuccess({ needsEmailConfirmation })
  } catch (error) {
    return actionFailure(toSetupSafeMessage('signUpAction', error))
  }
}

// -----------------------------------------------------------------------------
// ログイン
// -----------------------------------------------------------------------------

export type LoginResult = ActionResult<{ redirectTo: string }>

export async function signInAction(
  _prevState: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  const rawRedirect = formData.get('redirectTo')
  const redirectTo = sanitizeRedirect(typeof rawRedirect === 'string' ? rawRedirect : null)

  try {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      console.error('[OwnerBase] signInWithPassword', error)
      return actionFailure('メールアドレスまたはパスワードが正しくありません。')
    }
  } catch (error) {
    return actionFailure(toSetupSafeMessage('signInAction', error))
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

/**
 * オープンリダイレクトを防ぐ。
 * 同一サイト内の絶対パスだけを許可する。
 */
function sanitizeRedirect(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/')) return '/dashboard'
  // "//evil.example.com" のようなプロトコル相対 URL を弾く
  if (value.startsWith('//')) return '/dashboard'
  return value
}

// -----------------------------------------------------------------------------
// ログアウト
// -----------------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  } catch (error) {
    // ログアウトは失敗してもログイン画面へ送る
    console.error('[OwnerBase] signOutAction', error)
  }

  revalidatePath('/', 'layout')
  redirect('/login?reason=signed-out')
}

// -----------------------------------------------------------------------------
// パスワード再設定
// -----------------------------------------------------------------------------

export type ForgotPasswordResult = ActionResult<undefined>

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordResult | null,
  formData: FormData,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const origin = await getSiteOrigin()

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      // アカウントの存在有無を推測されないよう、失敗もログのみに留める
      console.error('[OwnerBase] resetPasswordForEmail', error)
    }
  } catch (error) {
    return actionFailure(toSetupSafeMessage('requestPasswordResetAction', error))
  }

  // 登録の有無にかかわらず同じメッセージを返す
  return actionSuccess(undefined, 'パスワード再設定用のメールを送信しました。')
}

export type ResetPasswordResult = ActionResult<undefined>

export async function updatePasswordAction(
  _prevState: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return actionFailure(
        'パスワード再設定用リンクの有効期限が切れています。もう一度メールを送信してください。',
      )
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

    if (error) {
      console.error('[OwnerBase] updateUser(password)', error)
      return actionFailure('パスワードの変更に失敗しました。時間をおいて再度お試しください。')
    }
  } catch (error) {
    return actionFailure(toSetupSafeMessage('updatePasswordAction', error))
  }

  revalidatePath('/', 'layout')
  return actionSuccess(undefined, 'パスワードを変更しました。')
}

// -----------------------------------------------------------------------------
// プロフィール
// -----------------------------------------------------------------------------

export type ProfileResult = ActionResult<undefined>

export async function updateProfileAction(
  _prevState: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error)
    return actionFailure(firstErrorMessage(fieldErrors), fieldErrors)
  }

  try {
    const context = await getSessionContext()
    if (!context) {
      throw new AppError('ログインの有効期限が切れました。もう一度ログインしてください。')
    }

    // role は送らない。DB のトリガーでも変更は拒否される。
    const { error } = await context.supabase
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone ?? null,
        organization_name: parsed.data.organizationName ?? null,
      })
      .eq('id', context.user.id)

    if (error) throw error
  } catch (error) {
    return actionFailure(handleError('updateProfileAction', error))
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return actionSuccess(undefined, 'プロフィールを更新しました。')
}

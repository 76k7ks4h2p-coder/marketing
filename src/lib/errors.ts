/**
 * エラーの扱い方の方針
 *
 * - 画面には日本語の簡潔なメッセージだけを出す
 * - SQL・スタックトレース・秘密情報は画面へ出さない（サーバーログにのみ残す）
 * - エラーは握りつぶさず、必ずログに出したうえで利用者向けメッセージへ変換する
 */

/** 利用者にそのまま見せてよいメッセージを持つエラー。 */
export class AppError extends Error {
  readonly userMessage: string

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage, options)
    this.name = 'AppError'
    this.userMessage = userMessage
  }
}

export const GENERIC_ERROR_MESSAGE =
  '処理中にエラーが発生しました。時間をおいて再度お試しください。解消しない場合は運営者へお問い合わせください。'

/**
 * DB 関数・トリガー・制約が投げるコードと、利用者向けメッセージの対応表。
 * PostgreSQL の例外メッセージ本文をそのまま画面へ出さないための変換層。
 */
const DOMAIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'ログインの有効期限が切れました。もう一度ログインしてください。',
  NOT_OWNER: 'この操作はオーナーアカウントでのみ実行できます。',
  FORBIDDEN: 'この操作を行う権限がありません。',
  REQUEST_NOT_FOUND: '対象の依頼が見つかりませんでした。',
  QUOTE_NOT_FOUND: '対象の見積もりが見つかりませんでした。',
  QUOTE_REQUEST_MISMATCH: 'この見積もりは選択しようとしている依頼のものではありません。',
  QUOTE_NOT_PUBLISHED: 'この見積もりはまだ公開されていません。',
  ALREADY_SELECTED: 'この依頼ではすでに見積もりが選択されています。',
  SELECTION_OWNER_MISMATCH: 'この依頼の見積もりを選択する権限がありません。',
  REQUEST_CLOSED: 'この依頼は完了またはキャンセル済みのため操作できません。',
  PUBLISHED_QUOTE_REQUIRED:
    '公開済みの見積もりが 1 件もありません。先に見積もりを公開してください。',
  FILE_LIMIT_EXCEEDED: 'アップロードできるファイルは 5 件までです。',
  ROLE_CHANGE_FORBIDDEN: '権限（ロール）を変更することはできません。',
  REQUEST_NUMBER_GENERATION_FAILED:
    '案件番号の発行に失敗しました。時間をおいて再度お試しください。',
}

/** PostgreSQL の SQLSTATE に対する既定メッセージ。 */
const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': '同じ内容がすでに登録されています。',
  '23503': '関連するデータが見つからないため処理できませんでした。',
  '23514': '入力内容がサービスの条件を満たしていません。内容をご確認ください。',
  '42501': 'この操作を行う権限がありません。',
  P0002: '対象のデータが見つかりませんでした。',
  PGRST116: '対象のデータが見つかりませんでした。',
  // RLS により 0 行が返る / 挿入が拒否されるケース
  '42P01': GENERIC_ERROR_MESSAGE,
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(source: UnknownRecord, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Supabase / PostgREST のエラーオブジェクトから、
 * 画面表示に適した日本語メッセージを組み立てる。
 */
export function toUserMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (error instanceof AppError) return error.userMessage

  if (isRecord(error)) {
    const rawMessage = readString(error, 'message') ?? ''
    const code = readString(error, 'code')

    // DB 関数が `raise exception 'ALREADY_SELECTED'` の形で投げたコードを拾う
    for (const key of Object.keys(DOMAIN_ERROR_MESSAGES)) {
      if (rawMessage.includes(key)) {
        return DOMAIN_ERROR_MESSAGES[key]
      }
    }

    if (code && PG_CODE_MESSAGES[code]) {
      return PG_CODE_MESSAGES[code]
    }
  }

  return fallback
}

/**
 * サーバー側にだけ詳細を残す。
 * 本番でも運用のために出力するが、キーやトークンは元々含まれない前提。
 */
export function logServerError(context: string, error: unknown): void {
  console.error(`[OwnerBase] ${context}`, error)
}

/** ログを残しつつ、利用者向けメッセージへ変換する。 */
export function handleError(context: string, error: unknown, fallback?: string): string {
  logServerError(context, error)
  return toUserMessage(error, fallback)
}

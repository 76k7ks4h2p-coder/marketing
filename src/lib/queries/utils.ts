import 'server-only'

import { AppError, logServerError, toUserMessage } from '@/lib/errors'

/**
 * postgrest-js のレスポンスは
 *   PostgrestResponseSuccess<T> | PostgrestResponseFailure
 * というユニオンなので、`{ data: T | null }` の形で受けると T を正しく推論できない。
 * レスポンス型そのものをジェネリックにして `TResult['data']` で取り出す。
 */
type AnyResult = { data: unknown; error: unknown }

function throwIfError(result: AnyResult, context: string): void {
  if (result.error) {
    logServerError(context, result.error)
    throw new AppError(toUserMessage(result.error, 'データの取得に失敗しました。'), {
      cause: result.error,
    })
  }
}

/** 0 件を許容する取得。エラー時のみ例外を投げる。 */
export function unwrapMaybe<TResult extends AnyResult>(
  result: TResult,
  context: string,
): TResult['data'] {
  throwIfError(result, context)
  return result.data
}

type ListResult = { data: unknown[] | null; error: unknown }

/** 一覧取得。null は空配列として扱う。 */
export function unwrapList<TResult extends ListResult>(
  result: TResult,
  context: string,
): NonNullable<TResult['data']>
export function unwrapList(result: ListResult, context: string): unknown[] {
  throwIfError(result, context)
  return result.data ?? []
}

/** 件数のみを取得するクエリ（head: true, count: 'exact'）。 */
export function unwrapCount(
  result: { count: number | null; error: unknown },
  context: string,
): number {
  throwIfError({ data: null, error: result.error }, context)
  return result.count ?? 0
}

/** 重複を除いた ID 配列を作る。 */
export function uniqueIds(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

/** id をキーにした Map を作る。 */
export function indexById<T extends { id: string | null }>(rows: readonly T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) {
    if (row.id) map.set(row.id, row)
  }
  return map
}

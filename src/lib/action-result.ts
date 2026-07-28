/** Server Action の共通戻り値。フォームからは useActionState で受け取る。 */

export type FieldErrors = Record<string, string[]>

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; message?: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors }

export function actionSuccess(): ActionResult<undefined>
export function actionSuccess<TData>(data: TData, message?: string): ActionResult<TData>
export function actionSuccess<TData>(data?: TData, message?: string): ActionResult<TData> {
  return { ok: true, data: data as TData, message }
}

export function actionFailure<TData = undefined>(
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<TData> {
  return { ok: false, message, fieldErrors }
}

/** useActionState の初期値。 */
export const IDLE_ACTION_STATE: ActionResult<undefined> | null = null

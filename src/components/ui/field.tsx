import { AlertCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

const CONTROL_CLASSES =
  'block w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-slate-400 focus:border-brand-500 disabled:bg-slate-100'

type FieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  hint?: ReactNode
  errors?: string[]
  children: ReactNode
  className?: string
}

/**
 * ラベル・補足・エラーをまとめたフォーム項目。
 * placeholder をラベル代わりにしないため、label は必須。
 */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  errors,
  children,
  className,
}: FieldProps) {
  const hasError = Boolean(errors && errors.length > 0)

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-600">
            <span aria-hidden="true">*</span>
            <span className="sr-only">（必須）</span>
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-ink-500">（任意）</span>
        )}
      </label>

      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}

      {children}

      {hasError ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-red-700"
        >
          {/* 色だけでなくアイコンとテキストでもエラーを伝える */}
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errors?.join(' ')}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Field と組み合わせて使う入力要素。aria 属性の付け忘れを防ぐ。 */
export function TextInput({
  className,
  hasError,
  describedBy,
  ...props
}: ComponentProps<'input'> & { hasError?: boolean; describedBy?: string }) {
  return (
    <input
      className={cn(CONTROL_CLASSES, hasError && 'border-red-500', className)}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy}
      {...props}
    />
  )
}

export function TextArea({
  className,
  hasError,
  describedBy,
  ...props
}: ComponentProps<'textarea'> & { hasError?: boolean; describedBy?: string }) {
  return (
    <textarea
      className={cn(
        CONTROL_CLASSES,
        'min-h-28 leading-relaxed',
        hasError && 'border-red-500',
        className,
      )}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy}
      {...props}
    />
  )
}

export function Select({
  className,
  hasError,
  describedBy,
  ...props
}: ComponentProps<'select'> & { hasError?: boolean; describedBy?: string }) {
  return (
    <select
      className={cn(CONTROL_CLASSES, 'pr-8', hasError && 'border-red-500', className)}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy}
      {...props}
    />
  )
}

/** 読み取り専用の固定値（例: 都道府県・市区町村）を表示する。 */
export function StaticValue({ children }: { children: ReactNode }) {
  return (
    <p className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-base text-ink-700">
      {children}
    </p>
  )
}

export { CONTROL_CLASSES }

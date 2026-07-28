'use client'

import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import type { ComponentProps } from 'react'

import { buttonClasses } from './button'

type Props = Omit<ComponentProps<'button'>, 'type'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  pendingLabel?: string
}

/**
 * 送信ボタン。送信中は disabled にして二重送信を防ぐ。
 * useFormStatus は form の子孫でのみ機能するため、必ず form の内側で使う。
 */
export function SubmitButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  pendingLabel = '送信中…',
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

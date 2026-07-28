'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { buttonClasses } from './button'

type Props = {
  /** ダイアログを開くボタンのラベル。 */
  triggerLabel: string
  triggerVariant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  triggerDisabled?: boolean
  triggerClassName?: string
  /** ダイアログのタイトル（必須）。 */
  title: string
  /** 確認文。 */
  message: ReactNode
  /**
   * ダイアログ内に表示する確定操作。
   * 通常は Server Action を呼ぶ <form> を渡す。
   */
  children: ReactNode
  cancelLabel?: string
}

/**
 * 確認ダイアログ。
 *
 * ネイティブの <dialog> を showModal() で開くことで、
 * フォーカストラップと Esc キーでの閉じる操作をブラウザ標準の挙動に任せている。
 */
export function ConfirmDialog({
  triggerLabel,
  triggerVariant = 'primary',
  triggerDisabled = false,
  triggerClassName,
  title,
  message,
  children,
  cancelLabel = 'キャンセル',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  const close = useCallback(() => {
    dialogRef.current?.close()
    setIsOpen(false)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    }

    const handleClose = () => setIsOpen(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        disabled={triggerDisabled}
        onClick={() => setIsOpen(true)}
        className={buttonClasses(triggerVariant, 'md', triggerClassName)}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-200 p-0 backdrop:bg-black/40"
        onCancel={() => setIsOpen(false)}
      >
        <div className="space-y-4 p-5">
          <h2 id={titleId} className="text-lg font-bold text-ink-900">
            {title}
          </h2>

          <div id={descriptionId} className="text-sm leading-relaxed text-ink-700">
            {message}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className={buttonClasses('secondary', 'md')}>
              {cancelLabel}
            </button>
            {children}
          </div>
        </div>
      </dialog>
    </>
  )
}

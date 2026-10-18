import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cx } from './format.ts'
import { CloseIcon } from './icons.tsx'

export type SheetSnap = 'peek' | 'half' | 'full'

interface BottomSheetProps {
  snap: SheetSnap
  onSnapChange(snap: SheetSnap): void
  onClose(): void
  label: string
  /** 中身が別の教室・建物に切り替わったことを表すキー（変わったらスクロールを先頭に戻す） */
  contentKey: string
  children: ReactNode
}

const PEEK = 148

function snapHeight(snap: SheetSnap, container: number): number {
  if (snap === 'peek') return Math.min(PEEK, container)
  if (snap === 'half') return Math.round(container * 0.56)
  return container - 8
}

/**
 * スマートフォン用のボトムシート。上端のつまみをドラッグ（またはタップ）して高さを変えられる。
 * 地図を見たいときは小さく、詳細を読むときは大きくできる。
 */
export function BottomSheet({
  snap,
  onSnapChange,
  onClose,
  label,
  contentKey,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)

  useEffect(() => {
    const parent = sheetRef.current?.parentElement
    if (!parent) return
    const measure = () => setContainerHeight(parent.clientHeight)
    if (typeof ResizeObserver === 'undefined') {
      const frameId = requestAnimationFrame(measure)
      window.addEventListener('resize', measure)
      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener('resize', measure)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [contentKey])

  const height = dragHeight ?? (containerHeight > 0 ? snapHeight(snap, containerHeight) : undefined)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = {
      startY: e.clientY,
      startHeight: sheetRef.current?.offsetHeight ?? 0,
      moved: false,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dy) < 6) return
    d.moved = true
    const next = Math.max(96, Math.min(containerHeight - 8, d.startHeight - dy))
    setDragHeight(next)
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) {
      // タップ：大きさを切り替える
      onSnapChange(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half')
      return
    }
    const current = dragHeight ?? d.startHeight
    setDragHeight(null)
    if (current < PEEK * 0.75) {
      onSnapChange('peek')
      return
    }
    const options: SheetSnap[] = ['peek', 'half', 'full']
    const nearest = options.reduce((best, s) =>
      Math.abs(snapHeight(s, containerHeight) - current) <
      Math.abs(snapHeight(best, containerHeight) - current)
        ? s
        : best,
    )
    onSnapChange(nearest)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{ height }}
      className={cx(
        'absolute inset-x-0 bottom-0 z-30 flex animate-sheet-in flex-col overflow-clip rounded-t-3xl border-t border-line bg-canvas shadow-[0_-8px_30px_rgba(0,0,0,0.12)]',
        dragHeight === null && 'transition-[height] duration-200 ease-out',
      )}
    >
      <div
        className="relative flex h-9 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          onClick={(e) => {
            // ポインター操作は onPointerUp で処理済み。キーボード（Enter / Space）のときだけ切り替える
            if (e.detail === 0) onSnapChange(snap === 'full' ? 'half' : 'full')
          }}
          className="flex h-9 w-24 items-center justify-center"
          aria-label={snap === 'full' ? 'パネルを小さくする' : 'パネルを大きくする'}
        >
          <span className="h-1.5 w-11 rounded-full bg-line-strong" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-2 flex size-10 items-center justify-center rounded-full bg-sunken text-muted hover:text-ink"
          aria-label="閉じる"
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <div
        ref={contentRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-6"
      >
        {children}
      </div>
    </div>
  )
}

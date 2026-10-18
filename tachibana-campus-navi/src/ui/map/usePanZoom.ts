import { useEffect, useRef, type RefObject } from 'react'
import { zoomAround, type View } from './view.ts'

type SetView = (update: (v: View) => View) => void

/** ドラッグと判定するまでの移動量（px）。これ未満ならタップ（建物の選択）として扱う */
const DRAG_THRESHOLD = 6

/**
 * ポインター（マウス・タッチ・ペン）での移動、2 本指のピンチ、ホイールでの拡大縮小。
 * ドラッグした直後のクリックは建物の選択として扱わないよう、suppressClick を返す。
 */
export function usePanZoom(
  ref: RefObject<HTMLElement | null>,
  setView: SetView,
  limitsRef: RefObject<{ min: number; max: number }>,
): RefObject<boolean> {
  const suppressClick = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const pointers = new Map<number, { x: number; y: number }>()
    let start: { x: number; y: number } | null = null
    let dragging = false

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, local(e))
      if (pointers.size === 1) {
        start = local(e)
        dragging = false
      } else {
        dragging = true
      }
    }

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const p = local(e)
      if (pointers.size === 1) {
        if (!dragging && start && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) {
          dragging = true
          try {
            el.setPointerCapture(e.pointerId)
          } catch {
            // 一部の環境では捕捉できないが、移動はそのまま続けられる
          }
        }
        if (dragging) setView((v) => ({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }))
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        if (!a || !b) return
        const other = a === prev ? b : a
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(p.x - other.x, p.y - other.y)
        const midBefore = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 }
        const midAfter = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 }
        if (before > 0) {
          setView((v) => {
            const zoomed = zoomAround(v, midBefore, after / before, limitsRef.current)
            return {
              ...zoomed,
              x: zoomed.x + midAfter.x - midBefore.x,
              y: zoomed.y + midAfter.y - midBefore.y,
            }
          })
        }
      }
      pointers.set(e.pointerId, p)
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return
      if (dragging) {
        // pointerup の直後に発生する click を 1 回だけ無視する
        suppressClick.current = true
        window.setTimeout(() => {
          suppressClick.current = false
        }, 0)
      }
      if (pointers.size === 0) {
        dragging = false
        start = null
      } else {
        start = [...pointers.values()][0] ?? null
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      // トラックパッドのピンチは ctrlKey 付きの wheel として届く
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))
      setView((v) => zoomAround(v, p, factor, limitsRef.current))
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref, setView, limitsRef])

  return suppressClick
}

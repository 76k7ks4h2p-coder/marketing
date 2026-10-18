import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Selection } from '../../state/saved.ts'
import { cx } from '../format.ts'
import { usePrefersReducedMotion } from '../hooks.ts'
import { FitIcon, MinusIcon, PlusIcon } from '../icons.tsx'
import type { MapItem } from './mapItems.ts'
import { usePanZoom } from './usePanZoom.ts'
import {
  clampView,
  fitView,
  focusView,
  lerpView,
  zoomAround,
  zoomLimits,
  type Frame,
  type Size,
  type View,
} from './view.ts'

interface CampusMapProps {
  frame: Frame
  items: MapItem[]
  selectedKey: string | null
  /** 値が変わるたびに選択中の建物へ移動する */
  focusToken: number
  onSelect(selection: Selection): void
  /** 位置が未登録で地図に描けない建物の数 */
  unplacedCount?: number
  /** フォーカスした建物を画面の上から何割の位置に置くか（ボトムシートで隠れないように） */
  focusAnchorY?: number
  className?: string
}

/**
 * SVG のキャンパス概略図。位置が登録された建物だけを描く（推測の位置は描かない）。
 * 測量図ではないことを常に画面に表示する。
 */
export function CampusMap({
  frame,
  items,
  selectedKey,
  focusToken,
  onSelect,
  unplacedCount = 0,
  focusAnchorY = 0.4,
  className,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>({ w: 0, h: 0 })
  const [view, setViewState] = useState<View>({ x: 0, y: 0, k: 1 })
  const viewRef = useRef(view)
  const sizeRef = useRef(size)
  const limitsRef = useRef({ min: 0.01, max: 100 })
  const animation = useRef<number | null>(null)
  const lastFocus = useRef<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const setView = useCallback(
    (update: (v: View) => View) => {
      if (animation.current !== null) {
        cancelAnimationFrame(animation.current)
        animation.current = null
      }
      setViewState((v) => clampView(update(v), frame, sizeRef.current))
    },
    [frame],
  )

  /** 次のフレームから target までなめらかに移動する（動きを減らす設定なら一度に移動） */
  const animateTo = useCallback(
    (target: View) => {
      if (animation.current !== null) cancelAnimationFrame(animation.current)
      const from = viewRef.current
      const duration = reducedMotion ? 0 : 380
      let started: number | null = null
      const step = (now: number) => {
        started ??= now
        const t = duration === 0 ? 1 : Math.min(1, (now - started) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setViewState(lerpView(from, target, eased))
        animation.current = t < 1 ? requestAnimationFrame(step) : null
      }
      animation.current = requestAnimationFrame(step)
    },
    [reducedMotion],
  )

  // 表示領域の大きさを追跡し、初回は全体が収まるように表示する
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let initialized = false
    const measure = () => {
      const next = { w: el.clientWidth, h: el.clientHeight }
      if (next.w === 0 || next.h === 0) return
      sizeRef.current = next
      limitsRef.current = zoomLimits(frame, next)
      setSize(next)
      if (!initialized) {
        initialized = true
        setViewState(fitView(frame, next))
      }
    }
    if (typeof ResizeObserver === 'undefined') {
      const frameId = requestAnimationFrame(measure)
      window.addEventListener('resize', measure)
      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener('resize', measure)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [frame])

  useEffect(
    () => () => {
      if (animation.current !== null) cancelAnimationFrame(animation.current)
    },
    [],
  )

  // 選択された建物へ移動
  useEffect(() => {
    if (size.w === 0 || lastFocus.current === focusToken) return
    lastFocus.current = focusToken
    const item = items.find((i) => i.key === selectedKey)
    if (!item) return
    const p = item.placement
    const rect =
      item.shape === 'point'
        ? { x: p.x - 40, y: p.y - 40, width: 80, height: 80 }
        : { x: p.x, y: p.y, width: p.width, height: p.height }
    animateTo(focusView(rect, frame, size, focusAnchorY))
  }, [focusToken, size, items, selectedKey, frame, focusAnchorY, animateTo])

  const suppressClick = usePanZoom(containerRef, setView, limitsRef)

  const zoomBy = (factor: number) =>
    setView((v) => zoomAround(v, { x: size.w / 2, y: size.h / 2 }, factor, limitsRef.current))

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const step = 60
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      setView((v) => ({ ...v, x: v.x + move[0], y: v.y + move[1] }))
    } else if (e.key === '+' || e.key === '=') {
      zoomBy(1.25)
    } else if (e.key === '-') {
      zoomBy(0.8)
    }
  }

  const choose = (item: MapItem) => {
    if (suppressClick.current) return
    onSelect(item.selection)
  }

  const k = view.k
  const fontSize = 13 / k

  return (
    <div className={cx('relative h-full w-full overflow-hidden bg-canvas', className)}>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="キャンパス概略図。矢印キーで移動、＋−キーで拡大縮小できます"
        className="h-full w-full touch-none select-none"
      >
        {size.w > 0 && (
          <svg width={size.w} height={size.h} className="block" role="group" aria-label="建物">
            <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
              <rect
                width={frame.width}
                height={frame.height}
                rx={14 / k}
                className="fill-map-ground stroke-line"
                strokeWidth={1 / k}
              />
              {items.map((item) => {
                const p = item.placement
                const selected = item.key === selectedKey
                const showName = item.shape === 'point' || p.width * k >= 70
                const label = [item.code, showName ? item.label : null].filter(Boolean).join(' ')
                const cxp = item.shape === 'point' ? p.x : p.x + p.width / 2
                const cyp = item.shape === 'point' ? p.y : p.y + p.height / 2
                return (
                  <g
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.code ? `${item.code} ` : ''}${item.label}`}
                    aria-pressed={selected}
                    onClick={() => choose(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(item.selection)
                      }
                    }}
                    className="group cursor-pointer outline-none"
                  >
                    {item.shape === 'rect' ? (
                      <>
                        <rect
                          x={p.x}
                          y={p.y}
                          width={p.width}
                          height={p.height}
                          rx={6 / k}
                          strokeWidth={(selected ? 3.5 : 1.5) / k}
                          strokeDasharray={
                            p.status === 'verified' ? undefined : `${6 / k} ${4 / k}`
                          }
                          className={cx(
                            selected
                              ? 'fill-accent-soft stroke-accent-fill'
                              : item.academic
                                ? 'fill-map-building stroke-line-strong'
                                : 'fill-sunken stroke-line-strong',
                          )}
                        />
                        <rect
                          x={p.x - 4 / k}
                          y={p.y - 4 / k}
                          width={p.width + 8 / k}
                          height={p.height + 8 / k}
                          rx={9 / k}
                          strokeWidth={3 / k}
                          className="hidden fill-none stroke-accent-fill group-focus-visible:block"
                        />
                      </>
                    ) : (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={9 / k}
                        strokeWidth={2 / k}
                        className={
                          selected
                            ? 'fill-accent-fill stroke-surface'
                            : 'fill-muted stroke-surface group-focus-visible:fill-accent-fill'
                        }
                      />
                    )}
                    <text
                      x={cxp}
                      y={item.shape === 'point' ? cyp + 20 / k : cyp}
                      fontSize={fontSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={cx(
                        'pointer-events-none font-bold',
                        selected ? 'fill-accent' : 'fill-ink',
                      )}
                      paintOrder="stroke"
                      stroke="var(--color-surface)"
                      strokeWidth={3 / k}
                    >
                      {label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>

      <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-surface/90 px-2.5 py-1 text-xs text-muted shadow-sm">
        <p className="font-semibold">キャンパス概略図（測量図ではありません）</p>
        {items.some((i) => i.placement.status !== 'verified') && (
          <p>破線の建物は位置の照合待ちです</p>
        )}
      </div>
      {unplacedCount > 0 && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-surface/90 px-2.5 py-1 text-xs text-muted shadow-sm">
          位置未登録の建物：{unplacedCount}棟（検索・一覧からは選べます）
        </p>
      )}
      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-md">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="flex size-11 items-center justify-center hover:bg-sunken"
          aria-label="拡大"
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          className="flex size-11 items-center justify-center border-t border-line hover:bg-sunken"
          aria-label="縮小"
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          onClick={() => animateTo(fitView(frame, size))}
          className="flex size-11 items-center justify-center border-t border-line hover:bg-sunken"
          aria-label="全体を表示"
        >
          <FitIcon />
        </button>
      </div>
    </div>
  )
}

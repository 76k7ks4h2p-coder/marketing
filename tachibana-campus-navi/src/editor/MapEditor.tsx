import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { buildCampusIndex } from '../domain/campusIndex.ts'
import { compareNatural } from '../domain/normalize.ts'
import type { CampusData } from '../domain/types.ts'
import { BrandMark } from '../ui/Chrome.tsx'
import { cx, OFFICIAL_CAMPUS_MAP_URL } from '../ui/format.ts'
import { useCampusData } from '../ui/hooks.ts'
import { CampusMap } from '../ui/map/CampusMap.tsx'
import { buildMapItems } from '../ui/map/mapItems.ts'
import { Button, ExternalLink } from '../ui/parts.tsx'
import {
  applyPlacements,
  draftsFromData,
  pointPlacement,
  rectFromDrag,
  toJson,
  type DraftPlacement,
  type Target,
} from './placements.ts'

interface BackgroundImage {
  url: string
  width: number
  height: number
  name: string
}

function download(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MapEditor() {
  const { state, retry } = useCampusData()
  if (state.status === 'ready') return <EditorWorkspace data={state.data} />
  return (
    <main className="flex h-dvh items-center justify-center p-6 text-center">
      {state.status === 'loading' ? (
        <p role="status">データを読み込んでいます…</p>
      ) : (
        <div role="alert" className="space-y-3">
          <p>{state.message}</p>
          <Button onClick={retry}>もう一度読み込む</Button>
        </div>
      )}
    </main>
  )
}

function EditorWorkspace({ data }: { data: CampusData }) {
  const [image, setImage] = useState<BackgroundImage | null>(null)
  const [frame, setFrame] = useState(() => data.meta.mapFrame ?? { width: 1600, height: 1000 })
  const [drafts, setDrafts] = useState(() => draftsFromData(data))
  const [target, setTarget] = useState<Target | null>(null)
  const [drag, setDrag] = useState<{
    a: { x: number; y: number }
    b: { x: number; y: number }
  } | null>(null)
  const [verified, setVerified] = useState(false)
  const [sourceNote, setSourceNote] = useState('公式キャンパスマップを下図にして手作業で配置')
  const [zoom, setZoom] = useState(1)
  const [preview, setPreview] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url)
    },
    [image],
  )

  const targets = useMemo(() => {
    const buildings = [...data.buildings]
      .sort((a, b) => compareNatural(a.code ?? `~${a.name}`, b.code ?? `~${b.name}`))
      .map((b) => ({
        target: { kind: 'building', id: b.id } as Target,
        label: b.code ? `${b.code} ${b.name}` : b.name,
      }))
    const points = data.facilities
      .filter((f) => !f.buildingId)
      .map((f) => ({ target: { kind: 'facility', id: f.id } as Target, label: `${f.name}（点）` }))
    return [...buildings, ...points]
  }, [data])

  const keyOf = (t: Target) => `${t.kind}:${t.id}`
  const targetKey = target ? keyOf(target) : null

  const updated = useMemo(
    () =>
      applyPlacements(data, drafts, {
        frame: {
          width: frame.width,
          height: frame.height,
          source: { sourceId: 'official-campus-map', note: sourceNote },
        },
        status: verified ? 'verified' : 'pending',
        source: { sourceId: 'official-campus-map', note: sourceNote },
      }),
    [data, drafts, frame, verified, sourceNote],
  )
  const previewIndex = useMemo(() => buildCampusIndex(updated), [updated])
  const previewItems = useMemo(() => buildMapItems(previewIndex), [previewIndex])

  const onFile = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImage({ url, width: img.naturalWidth, height: img.naturalHeight, name: file.name })
      setFrame({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = url
  }

  const toMap = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }

  const commit = (t: Target, placement: DraftPlacement) => {
    setDrafts((prev) => new Map(prev).set(keyOf(t), placement))
    // 次の未配置の対象へ進む
    const next = targets.find((x) => keyOf(x.target) !== keyOf(t) && !drafts.has(keyOf(x.target)))
    setTarget(next?.target ?? null)
  }

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!target) return
    const p = toMap(e)
    if (target.kind === 'facility') {
      commit(target, pointPlacement(p))
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ a: p, b: p })
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (drag) setDrag({ ...drag, b: toMap(e) })
  }
  const onUp = () => {
    if (!drag || !target) return
    const r = rectFromDrag(drag.a, drag.b, frame)
    setDrag(null)
    if (r.width >= 4 && r.height >= 4) commit(target, r)
  }

  const live = drag ? rectFromDrag(drag.a, drag.b, frame) : null
  const placedCount = targets.filter((t) => drafts.has(keyOf(t.target))).length

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <aside className="flex max-h-[45dvh] shrink-0 flex-col border-b border-line bg-surface lg:max-h-none lg:w-96 lg:border-r lg:border-b-0">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <h1 className="font-extrabold">配置エディタ（保守用）</h1>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            <ExternalLink href={OFFICIAL_CAMPUS_MAP_URL}>公式キャンパスマップ</ExternalLink>
            の画像を下図に読み込み、建物の範囲をドラッグして登録します。画像はこの端末の中だけで使い、送信も保存もしません。アプリには位置の数値だけが入ります。
          </p>
          <label className="block text-sm font-semibold">
            下図の画像
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1 block w-full text-sm"
            />
          </label>
          {image && (
            <p className="text-xs text-muted">
              {image.name}（{image.width}×{image.height}px）
            </p>
          )}
        </div>
        <ol className="min-h-0 flex-1 overflow-y-auto p-2">
          {targets.map(({ target: t, label }) => {
            const k = keyOf(t)
            const placed = drafts.has(k)
            return (
              <li key={k} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTarget(t)}
                  aria-pressed={k === targetKey}
                  className={cx(
                    'flex min-h-10 flex-1 items-center justify-between rounded-lg px-3 text-left text-sm',
                    k === targetKey ? 'bg-accent-fill font-bold text-on-accent' : 'hover:bg-sunken',
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cx(
                      'text-xs',
                      k === targetKey ? '' : placed ? 'text-ok' : 'text-muted',
                    )}
                  >
                    {placed ? '配置済み' : '未配置'}
                  </span>
                </button>
                {placed && (
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((prev) => {
                        const next = new Map(prev)
                        next.delete(k)
                        return next
                      })
                    }
                    className="min-h-10 rounded-lg px-2 text-xs text-danger hover:bg-danger-soft"
                    aria-label={`${label} の配置を消す`}
                  >
                    消す
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <div className="space-y-3 border-t border-line p-4 text-sm">
          <p>
            配置済み {placedCount} / {targets.length}
          </p>
          <label className="block">
            出典のメモ
            <input
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              className="mt-1 block min-h-10 w-full rounded-lg border border-line-strong bg-surface px-2"
            />
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="mt-1"
            />
            <span>
              公式キャンパスマップと照合済みとして書き出す（未チェックなら「照合待ち」として破線で表示）
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                download('buildings.json', toJson(updated.buildings))
                download('facilities.json', toJson(updated.facilities))
                download('meta.json', toJson(updated.meta))
              }}
            >
              JSON を書き出す
            </Button>
            <Button onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
              {preview ? '編集に戻る' : 'アプリでの見え方'}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            書き出した 3 ファイルで public/data/ を置き換え、pnpm data:check と pnpm test
            を通してから公開してください。
          </p>
        </div>
      </aside>

      <main className="relative min-h-0 flex-1 bg-canvas">
        {preview ? (
          <CampusMap
            frame={frame}
            items={previewItems}
            selectedKey={targetKey}
            focusToken={0}
            onSelect={(sel) =>
              setTarget({ kind: sel.kind === 'facility' ? 'facility' : 'building', id: sel.id })
            }
          />
        ) : (
          <div className="h-full overflow-auto">
            <div className="sticky top-0 z-10 flex items-center gap-3 bg-canvas/95 px-4 py-2 text-sm">
              <span className="font-semibold">
                {target
                  ? target.kind === 'facility'
                    ? `「${targets.find((t) => keyOf(t.target) === targetKey)?.label}」の位置をクリック`
                    : `「${targets.find((t) => keyOf(t.target) === targetKey)?.label}」の範囲をドラッグ`
                  : '左の一覧から配置する建物を選んでください'}
              </span>
              <label className="ml-auto flex items-center gap-2">
                拡大
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${frame.width} ${frame.height}`}
              width={frame.width * zoom}
              height={frame.height * zoom}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              className={cx(
                'm-4 block touch-none bg-map-ground',
                target ? 'cursor-crosshair' : 'cursor-default',
              )}
            >
              {image && (
                <image href={image.url} width={frame.width} height={frame.height} opacity={0.85} />
              )}
              {[...drafts.entries()].map(([k, d]) => (
                <g key={k}>
                  {d.width <= 1 ? (
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={8}
                      className={k === targetKey ? 'fill-accent-fill' : 'fill-ok'}
                    />
                  ) : (
                    <rect
                      x={d.x}
                      y={d.y}
                      width={d.width}
                      height={d.height}
                      className={cx(
                        'fill-accent-fill/15',
                        k === targetKey ? 'stroke-accent-fill' : 'stroke-ok',
                      )}
                      strokeWidth={3}
                    />
                  )}
                </g>
              ))}
              {live && (
                <rect
                  x={live.x}
                  y={live.y}
                  width={live.width}
                  height={live.height}
                  className="fill-accent-fill/25 stroke-accent-fill"
                  strokeDasharray="8 4"
                  strokeWidth={3}
                />
              )}
            </svg>
          </div>
        )}
      </main>
    </div>
  )
}

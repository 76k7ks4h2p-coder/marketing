import { useEffect, useRef } from 'react'
import type { AccessMethod } from '../domain/types.ts'
import {
  OFFICIAL_ACCESSIBILITY_MAP_URL,
  OFFICIAL_CAMPUS_MAP_URL,
  OFFICIAL_CLASSROOM_LIST_URL,
  statusText,
} from './format.ts'
import { CloseIcon } from './icons.tsx'
import { useNavi } from './naviContext.ts'
import { ExternalLink, VerificationBadge } from './parts.tsx'

const ACCESS_LABEL: Record<AccessMethod, string> = {
  direct: '原本を確認',
  'search-index': '検索エンジンの索引から転記（原本未照合）',
  provided: '開発指示書で提供',
  'not-accessed': '未取得（内容は未反映）',
}

export function AboutDialog({ onClose }: { onClose(): void }) {
  const { index } = useNavi()
  const closeRef = useRef<HTMLButtonElement>(null)
  const { data } = index

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  const rooms = data.rooms
  const verified = rooms.filter((r) => r.status === 'verified').length
  const pending = rooms.filter((r) => r.status === 'pending').length
  const placed = data.buildings.filter((b) => b.map).length
  const verifiedEdges = data.routeGraph.edges.filter((e) => e.status === 'verified').length
  const floorMaps = data.floors.filter((f) => f.floorMap).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl animate-sheet-in flex-col rounded-t-3xl bg-canvas sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="about-title" className="text-lg font-bold">
            このアプリについて
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full hover:bg-sunken"
            aria-label="閉じる"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5 text-[15px] leading-relaxed">
          <section className="space-y-2">
            <p>
              <strong>Tachibana Campus Navi</strong>
              は、京都橘大学の教室を教室番号から探すための学生制作のウェブアプリです。
              <strong>
                京都橘大学の公式サービスではなく、大学による認定・承認も受けていません。
              </strong>
            </p>
            <p>
              授業の教室は、必ず大学のポータルサイト（時間割）や掲示もあわせて確認してください。
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-bold">情報の確認状況</h3>
            <ul className="space-y-2">
              {(['verified', 'pending'] as const).map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <VerificationBadge status={s} />
                  <span className="text-sm text-muted">{statusText(s).description}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold">
              収録状況（データ版 {data.meta.version}・{data.meta.updatedAt}）
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">教室</dt>
              <dd>
                {rooms.length}室（照合済み {verified}・照合待ち {pending}）
              </dd>
              <dt className="text-muted">建物</dt>
              <dd>{data.buildings.length}棟</dd>
              <dt className="text-muted">施設</dt>
              <dd>{data.facilities.length}件（食堂・学習スペース・門など）</dd>
              <dt className="text-muted">建物の位置</dt>
              <dd>{placed > 0 ? `${placed}棟を登録` : '未登録'}</dd>
              <dt className="text-muted">通路（経路）</dt>
              <dd>{verifiedEdges > 0 ? `検証済み ${verifiedEdges} 区間` : '未登録'}</dd>
              <dt className="text-muted">フロアマップ</dt>
              <dd>{floorMaps > 0 ? `${floorMaps}フロア` : '未登録'}</dd>
              <dt className="text-muted">バリアフリー設備</dt>
              <dd>未登録</dd>
            </dl>
            {data.meta.notes.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
                {data.meta.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-bold">大学の公式情報</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <ExternalLink href={OFFICIAL_CAMPUS_MAP_URL}>キャンパスマップ</ExternalLink>
              </li>
              <li>
                <ExternalLink href={OFFICIAL_CLASSROOM_LIST_URL}>
                  履修の手引き キャンパスマップ／教室一覧
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={OFFICIAL_ACCESSIBILITY_MAP_URL}>
                  バリアフリーマップ（2026年10月版・PDF）
                </ExternalLink>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold">出典</h3>
            <ul className="space-y-3 text-sm">
              {data.sources.map((s) => (
                <li key={s.id}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2"
                    >
                      {s.title}
                    </a>
                  ) : (
                    <span className="font-semibold">{s.title}</span>
                  )}
                  <span className="block text-muted">
                    {s.publisher}・{ACCESS_LABEL[s.accessMethod]}
                    {s.accessedAt ? `・${s.accessedAt}` : ''}
                  </span>
                  {s.note && <span className="block text-muted">{s.note}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold">プライバシー</h3>
            <p className="text-sm text-muted">
              ログインは不要です。個人情報や位置情報は収集しません。お気に入りと検索履歴はこの端末のブラウザ内にだけ保存され、外部には送信されません。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

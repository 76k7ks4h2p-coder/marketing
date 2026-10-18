import { assembleCampusData, DATA_FILES, type RawCampusFiles } from '../domain/assemble.ts'
import type { CampusData } from '../domain/types.ts'

export interface LoadedCampusData {
  data: CampusData
  /** 画面に出す注意（一部ファイルの取得失敗など） */
  warnings: string[]
}

export class CampusDataError extends Error {}

/**
 * public/data/*.json を並列に取得して検証する。
 * 教室・建物のデータが取れない場合だけエラーにし、それ以外のファイルの失敗は警告にとどめる。
 */
export async function loadCampusData(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadedCampusData> {
  // 単体 HTML 版はデータを埋め込んでいるので取得しない
  if (__TCN_EMBEDDED_DATA__) return finish(__TCN_EMBEDDED_DATA__, [])

  const keys = Object.keys(DATA_FILES) as (keyof RawCampusFiles)[]
  const results = await Promise.all(
    keys.map(async (key) => {
      const file = DATA_FILES[key]
      try {
        const response = await fetchImpl(`${baseUrl}data/${file}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return { key, value: (await response.json()) as unknown, failed: null }
      } catch {
        return { key, value: undefined, failed: file }
      }
    }),
  )

  const raw: RawCampusFiles = {}
  for (const r of results) raw[r.key] = r.value
  return finish(
    raw,
    results.flatMap((r) => (r.failed ? [r.failed] : [])),
  )
}

/** 検証して画面用のデータにする（取得に失敗したファイル名は警告として残す） */
function finish(raw: RawCampusFiles, failed: string[]): LoadedCampusData {
  if (raw.buildings === undefined || raw.rooms === undefined) {
    throw new CampusDataError('教室・建物のデータを読み込めませんでした。')
  }

  const { data, issues } = assembleCampusData(raw)
  if (data.rooms.length === 0 || data.buildings.length === 0) {
    throw new CampusDataError('教室・建物のデータが空か、形式が正しくありません。')
  }

  const warnings: string[] = []
  if (failed.length > 0) {
    warnings.push(
      `一部のデータ（${failed.join('、')}）を読み込めませんでした。表示が不完全な場合があります。`,
    )
  }
  if (issues.length > 0) {
    console.warn('[Tachibana Campus Navi] データの問題:', issues)
    warnings.push(
      `データの一部（${issues.length} 件）に問題があったため、その部分を除いて表示しています。`,
    )
  }
  return { data, warnings }
}

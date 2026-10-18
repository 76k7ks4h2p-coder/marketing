import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'
import { assembleCampusData, DATA_FILES, type RawCampusFiles } from '../src/domain/assemble.ts'
import { buildCampusIndex } from '../src/domain/campusIndex.ts'

// jsdom 環境では import.meta.url が file: URL にならないため、プロジェクトルート（vitest の実行位置）基準にする
export const dataDir = `${resolve(process.cwd(), 'public/data')}/`
export const csvPath = resolve(process.cwd(), 'data/rooms.csv')

export function readDataFile(file: string): unknown {
  return JSON.parse(readFileSync(`${dataDir}${file}`, 'utf8'))
}

/** リポジトリに含まれる実データを読み込む */
export function loadRawFiles(): RawCampusFiles {
  return Object.fromEntries(
    Object.entries(DATA_FILES).map(([key, file]) => [key, readDataFile(file)]),
  ) as RawCampusFiles
}

export function loadRealData() {
  return assembleCampusData(loadRawFiles())
}

export function loadRealIndex() {
  return buildCampusIndex(loadRealData().data)
}

/** fetch('…/data/xxx.json') に実データを返すモック */
export function mockDataFetch(options: { fail?: string[] } = {}) {
  const fail = new Set(options.fail ?? [])
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const file = url.split('/').pop()?.split('?')[0] ?? ''
    if (fail.has(file)) return new Response('not found', { status: 404 })
    try {
      return new Response(readFileSync(`${dataDir}${file}`, 'utf8'), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      return new Response('not found', { status: 404 })
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

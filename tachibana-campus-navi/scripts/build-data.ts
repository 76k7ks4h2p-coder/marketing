/**
 * data/rooms.csv から public/data/rooms.json を生成し、全データファイルの整合性を検査する。
 *
 *   pnpm data:build   … 生成して検査（dev / build の前に自動実行）
 *   pnpm data:check   … 生成結果と既存ファイルが一致しているかだけを確認（CI 向け）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assembleCampusData, DATA_FILES, type RawCampusFiles } from '../src/domain/assemble.ts'
import { roomsFromCsv } from '../src/domain/roomsCsv.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const dataDir = `${root}public/data/`
const csvPath = `${root}data/rooms.csv`
const roomsJsonPath = `${dataDir}${DATA_FILES.rooms}`
const checkOnly = process.argv.includes('--check')

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(`${dataDir}${file}`, 'utf8'))
}

const csv = roomsFromCsv(readFileSync(csvPath, 'utf8'))
const roomsJson = `${JSON.stringify(csv.value, null, 2)}\n`

const raw: RawCampusFiles = {
  meta: readJson(DATA_FILES.meta),
  buildings: readJson(DATA_FILES.buildings),
  floors: readJson(DATA_FILES.floors),
  rooms: csv.value,
  facilities: readJson(DATA_FILES.facilities),
  routeGraph: readJson(DATA_FILES.routeGraph),
  sources: readJson(DATA_FILES.sources),
}
const { data, issues } = assembleCampusData(raw)
const allIssues = [...csv.issues, ...issues]

if (allIssues.length > 0) {
  console.error(`データに ${allIssues.length} 件の問題があります:`)
  for (const issue of allIssues) console.error(`  - ${issue}`)
  process.exit(1)
}

if (checkOnly) {
  let current = ''
  try {
    current = readFileSync(roomsJsonPath, 'utf8')
  } catch {
    // 未生成
  }
  if (current !== roomsJson) {
    console.error(
      'public/data/rooms.json が data/rooms.csv と一致しません。pnpm data:build を実行してください。',
    )
    process.exit(1)
  }
} else {
  writeFileSync(roomsJsonPath, roomsJson)
}

const count = (status: string) => data.rooms.filter((r) => r.status === status).length
const placed = data.buildings.filter((b) => b.map).length
const verifiedEdges = data.routeGraph.edges.filter((e) => e.status === 'verified').length
console.log(
  [
    `教室 ${data.rooms.length} 室（照合済み ${count('verified')} / 照合待ち ${count('pending')} / 未確認 ${count('unverified')}）`,
    `建物 ${data.buildings.length} 棟（地図配置あり ${placed}）・階 ${data.floors.length}・施設 ${data.facilities.length}`,
    `経路ノード ${data.routeGraph.nodes.length}・経路エッジ ${data.routeGraph.edges.length}（検証済み ${verifiedEdges}）`,
    checkOnly ? 'rooms.json は CSV と一致しています。' : 'public/data/rooms.json を生成しました。',
  ].join('\n'),
)

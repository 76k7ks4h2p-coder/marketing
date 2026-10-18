/**
 * 教室一覧 CSV（data/rooms.csv）と Room の相互変換。
 * 大学の担当者が Excel やスプレッドシートで編集できるよう、教室一覧の正本は CSV にしている。
 */
import { csvToRecords, toCsv } from './csv.ts'
import { parseRoom, type Parsed } from './validate.ts'
import type { Room } from './types.ts'

export const ROOM_CSV_HEADER = [
  'code',
  'building_id',
  'floor',
  'name',
  'capacity',
  'status',
  'source_id',
  'checked_at',
  'note',
] as const

function toNumberOrNull(value: string): number | string | null {
  if (value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

export function roomsFromCsv(text: string): Parsed<Room[]> {
  const records = csvToRecords(text)
  const rooms: Room[] = []
  const issues: string[] = []
  const header = Object.keys(records[0] ?? {})
  const missing = ROOM_CSV_HEADER.filter((h) => !header.includes(h))
  if (records.length > 0 && missing.length > 0) {
    return { value: [], issues: [`rooms.csv: 列がありません: ${missing.join(', ')}`] }
  }
  records.forEach((r, i) => {
    // 見出し行を 1 行目として、データ行は 2 行目から
    const path = `rooms.csv ${i + 2}行目`
    try {
      rooms.push(
        parseRoom(
          {
            code: (r.code ?? '').normalize('NFKC').toUpperCase(),
            buildingId: r.building_id,
            floor: toNumberOrNull(r.floor ?? ''),
            name: r.name || null,
            capacity: toNumberOrNull(r.capacity ?? ''),
            status: r.status,
            sourceId: r.source_id,
            checkedAt: r.checked_at,
            note: r.note || null,
          },
          path,
        ),
      )
    } catch (e) {
      issues.push(e instanceof Error ? e.message : String(e))
    }
  })
  return { value: rooms, issues }
}

export function roomsToCsv(rooms: Room[]): string {
  return toCsv(
    [...ROOM_CSV_HEADER],
    rooms.map((r) => [
      r.code,
      r.buildingId,
      String(r.floor),
      r.name ?? '',
      r.capacity === null ? '' : String(r.capacity),
      r.status,
      r.sourceId,
      r.checkedAt,
      r.note ?? '',
    ]),
  )
}

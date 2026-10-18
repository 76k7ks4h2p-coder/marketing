import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assembleCampusData } from '../src/domain/assemble.ts'
import { parseCsv } from '../src/domain/csv.ts'
import { roomsFromCsv, roomsToCsv } from '../src/domain/roomsCsv.ts'
import { checkIntegrity } from '../src/domain/validate.ts'
import { csvPath, loadRawFiles, loadRealData, readDataFile } from './helpers.ts'

describe('同梱データの整合性', () => {
  const { data, issues } = loadRealData()

  it('検証で問題が 1 件もない', () => {
    expect(issues).toEqual([])
  })

  it('rooms.json は rooms.csv から生成した内容と一致する（pnpm data:build 済み）', () => {
    const fromCsv = roomsFromCsv(readFileSync(csvPath, 'utf8'))
    expect(fromCsv.issues).toEqual([])
    expect(readDataFile('rooms.json')).toEqual(fromCsv.value)
  })

  it('すべての教室で、番号の階と登録された階が一致する', () => {
    for (const room of data.rooms) {
      const building = data.buildings.find((b) => b.id === room.buildingId)
      expect(building?.roomCodeRule, room.code).toBeTruthy()
      const digit = room.code.slice(building?.roomCodeRule?.prefix.length ?? 0)[0]
      const level = digit === '0' ? -1 : Number(digit)
      expect(level, room.code).toBe(room.floor)
    }
  })

  it('「照合済み」は開発指示書 §8 の 6 教室だけ', () => {
    const verified = data.rooms.filter((r) => r.status === 'verified').map((r) => r.code)
    expect(verified.sort()).toEqual(['111', '2202', 'A201', 'G001', 'H301', 'J804'])
  })

  it('位置・経路は推測で登録していない（地図の配置は公式キャンパスマップ由来、通路は照合済みのみ）', () => {
    for (const item of [...data.buildings, ...data.facilities]) {
      if (!item.map) continue
      expect(['verified', 'pending'], item.id).toContain(item.map.status)
      expect(item.map.source.sourceId, item.id).toBe('official-campus-map')
    }
    if (data.buildings.some((b) => b.map)) expect(data.meta.mapFrame).not.toBeNull()
    for (const e of data.routeGraph.edges) {
      expect(e.status, e.id).toBe('verified')
    }
  })

  it('バリアフリーマップは未取得として明示されている', () => {
    const pdf = data.sources.find((s) => s.id === 'accessibility-map-2026')
    expect(pdf?.accessMethod).toBe('not-accessed')
    expect(pdf?.url).toBe('https://www.tachibana-u.ac.jp/about/campus/pdf/2026_accessibility.pdf')
  })
})

describe('データ検証は不正なデータで画面を壊さない', () => {
  it('不正なレコードだけを除外し、理由を返す', () => {
    const raw = loadRawFiles()
    const rooms = [...(raw.rooms as unknown[]), { code: 'X1' }, 'broken']
    const { data, issues } = assembleCampusData({ ...raw, rooms })
    expect(data.rooms.length).toBe((raw.rooms as unknown[]).length)
    expect(issues.length).toBeGreaterThanOrEqual(2)
  })

  it('ファイルがすべて欠けても空のデータとして扱える', () => {
    const { data, issues } = assembleCampusData({})
    expect(data.rooms).toEqual([])
    expect(data.buildings).toEqual([])
    expect(issues.length).toBeGreaterThan(0)
  })

  it('存在しない建物や番号規則に合わない教室を検出する', () => {
    const { data } = loadRealData()
    const broken = {
      ...data,
      rooms: [
        ...data.rooms,
        { ...data.rooms[0]!, code: '151', floor: 4 },
        { ...data.rooms[0]!, code: 'Q101', buildingId: 'nowhere' },
      ],
    }
    const issues = checkIntegrity(broken)
    expect(issues.some((i) => i.includes('151'))).toBe(true)
    expect(issues.some((i) => i.includes('nowhere'))).toBe(true)
  })
})

describe('CSV', () => {
  it('引用符・カンマ・改行を含むセルを読める', () => {
    expect(parseCsv('a,b\n"x,1","y ""2"""\n"multi\nline",z\n')).toEqual([
      ['a', 'b'],
      ['x,1', 'y "2"'],
      ['multi\nline', 'z'],
    ])
  })

  it('BOM 付き・CRLF の CSV を読める', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('Room → CSV → Room で内容が変わらない', () => {
    const { data } = loadRealData()
    const back = roomsFromCsv(roomsToCsv(data.rooms))
    expect(back.issues).toEqual([])
    expect(back.value).toEqual(data.rooms)
  })

  it('列が足りない CSV はエラーにする', () => {
    expect(roomsFromCsv('code,floor\nH301,3\n').issues[0]).toContain('列がありません')
  })
})

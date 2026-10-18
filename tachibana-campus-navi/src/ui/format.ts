import type { FacilityCategory, VerificationStatus } from '../domain/types.ts'

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const OFFICIAL_CAMPUS_MAP_URL = 'https://www.tachibana-u.ac.jp/about/campus/campus.html'
export const OFFICIAL_CLASSROOM_LIST_URL = 'https://cai6.tachibana-u.ac.jp/kyomu/courses/map.html'
export const OFFICIAL_ACCESSIBILITY_MAP_URL =
  'https://www.tachibana-u.ac.jp/about/campus/pdf/2026_accessibility.pdf'

const STATUS_TEXT: Record<VerificationStatus, { label: string; description: string }> = {
  verified: {
    label: '照合済み',
    description: '公式資料と照合済みの情報です。',
  },
  pending: {
    label: '照合待ち',
    description:
      '公式資料に掲載されている情報ですが、原本との最終照合がまだ済んでいません。時間割や掲示もあわせて確認してください。',
  },
  unverified: {
    label: '未確認',
    description: '根拠を確認できていない情報です。',
  },
}

export function statusText(status: VerificationStatus) {
  return STATUS_TEXT[status]
}

export const CATEGORY_LABEL: Record<FacilityCategory, string> = {
  dining: '食堂',
  cafe: 'カフェ',
  library: '図書館',
  commons: '学習スペース',
  office: '窓口',
  gate: '門',
  transport: '交通',
  sports: 'スポーツ施設',
  accessibility: 'バリアフリー設備',
  other: '施設',
}

export function formatCapacity(capacity: number | null): string {
  return capacity === null ? '公式一覧に記載なし' : `${capacity}人`
}

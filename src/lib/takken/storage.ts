import { EMPTY_PROGRESS, normalizeProgress } from './progress'
import type { ProgressState } from './types'

/**
 * 学習履歴の保存先。
 *
 * サーバーもアカウントも使わず、端末の localStorage だけで完結させている。
 * 履歴が消えても学習内容そのものは失われないため、これで十分と判断した。
 */
export const STORAGE_KEY = 'takken-minpo-progress-v1'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    // プライベートブラウジングなどで localStorage にアクセスできない場合がある
    return null
  }
}

export function loadProgress(): ProgressState {
  const storage = getStorage()
  if (!storage) return EMPTY_PROGRESS

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PROGRESS
    return normalizeProgress(JSON.parse(raw))
  } catch {
    // 壊れた JSON が入っていても画面は動かす
    return EMPTY_PROGRESS
  }
}

export function saveProgress(state: ProgressState): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 容量超過などで保存できなくても演習は続けられるようにする
  }
}

export function clearProgress(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // 何もしない
  }
}

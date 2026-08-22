'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  EMPTY_PROGRESS,
  recordAnswer as applyAnswer,
  recordAnswers as applyAnswers,
  resetProgress,
  toggleFlag as applyFlag,
} from '@/lib/takken/progress'
import { clearProgress, loadProgress, saveProgress } from '@/lib/takken/storage'
import type { AnswerRecord, ProgressState } from '@/lib/takken/types'

/**
 * 学習履歴のストア。
 *
 * localStorage は React の外にある状態なので、useSyncExternalStore で購読する。
 * こうすると、同じ画面に複数のコンポーネントがあっても履歴が 1 つに保たれ、
 * サーバー描画時とハイドレーション時には必ず空の履歴が使われるので
 * 表示の食い違いも起きない。
 */

type Snapshot = {
  readonly progress: ProgressState
  readonly loaded: boolean
}

/** サーバー描画とハイドレーションで使う固定のスナップショット。 */
const SERVER_SNAPSHOT: Snapshot = { progress: EMPTY_PROGRESS, loaded: false }

let snapshot: Snapshot | null = null
const listeners = new Set<() => void>()

function getSnapshot(): Snapshot {
  // 最初に読まれたときだけ localStorage を読み、以後はキャッシュを返す。
  // 毎回新しいオブジェクトを返すと無限に再描画されるため参照を固定する。
  snapshot ??= { progress: loadProgress(), loaded: true }
  return snapshot
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

/** 履歴を差し替えて保存し、購読しているコンポーネントに知らせる。 */
function commit(next: ProgressState): void {
  snapshot = { progress: next, loaded: true }
  saveProgress(next)
  emit()
}

/** 現在の履歴（React の外から読む用）。 */
function current(): ProgressState {
  return getSnapshot().progress
}

export function useProgress() {
  const { progress, loaded } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const recordAnswer = useCallback((answer: AnswerRecord) => {
    commit(applyAnswer(current(), answer))
  }, [])

  const recordAnswers = useCallback((answers: readonly AnswerRecord[]) => {
    commit(applyAnswers(current(), answers))
  }, [])

  const toggleFlag = useCallback((questionId: string) => {
    commit(applyFlag(current(), questionId))
  }, [])

  const reset = useCallback(() => {
    clearProgress()
    snapshot = { progress: resetProgress(), loaded: true }
    emit()
  }, [])

  return { progress, loaded, recordAnswer, recordAnswers, toggleFlag, reset }
}

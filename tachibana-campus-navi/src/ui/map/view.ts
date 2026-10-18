/** 地図の表示状態（画面座標 = 地図座標 × k + (x, y)） */
export interface View {
  x: number
  y: number
  k: number
}

export interface Size {
  w: number
  h: number
}

export interface Frame {
  width: number
  height: number
}

/** 地図全体が画面に収まる表示 */
export function fitView(frame: Frame, size: Size, padding = 0.92): View {
  const k = Math.min(size.w / frame.width, size.h / frame.height) * padding
  return { k, x: (size.w - frame.width * k) / 2, y: (size.h - frame.height * k) / 2 }
}

export function zoomLimits(frame: Frame, size: Size): { min: number; max: number } {
  const fit = fitView(frame, size).k
  return { min: fit * 0.6, max: fit * 8 }
}

/** 画面上の点 p を中心に拡大・縮小する */
export function zoomAround(
  v: View,
  p: { x: number; y: number },
  factor: number,
  limits: { min: number; max: number },
): View {
  const k = Math.min(limits.max, Math.max(limits.min, v.k * factor))
  const actual = k / v.k
  return { k, x: p.x - (p.x - v.x) * actual, y: p.y - (p.y - v.y) * actual }
}

/** 地図が画面の外へ逃げないよう、画面中央が常に地図の範囲内に入るように制限する */
export function clampView(v: View, frame: Frame, size: Size): View {
  const cx = size.w / 2
  const cy = size.h / 2
  return {
    k: v.k,
    x: Math.min(cx, Math.max(cx - frame.width * v.k, v.x)),
    y: Math.min(cy, Math.max(cy - frame.height * v.k, v.y)),
  }
}

/** 矩形を画面の (anchorX, anchorY) 割合の位置に、程よい大きさで表示する */
export function focusView(
  rect: { x: number; y: number; width: number; height: number },
  frame: Frame,
  size: Size,
  anchorY = 0.5,
): View {
  const limits = zoomLimits(frame, size)
  const k = Math.min(
    limits.max,
    Math.max(
      fitView(frame, size).k,
      Math.min(size.w / (rect.width * 3.2), size.h / (rect.height * 3.2)),
    ),
  )
  return {
    k,
    x: size.w / 2 - (rect.x + rect.width / 2) * k,
    y: size.h * anchorY - (rect.y + rect.height / 2) * k,
  }
}

export function lerpView(a: View, b: View, t: number): View {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k: a.k + (b.k - a.k) * t }
}

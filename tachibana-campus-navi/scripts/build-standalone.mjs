/**
 * vite build --mode standalone の出力（dist-standalone/）を、JS・CSS・アイコンまで
 * 1 つの HTML ファイルにまとめる。データはビルド時に JS へ埋め込み済み。
 *   pnpm build:standalone → dist-standalone/tachibana-campus-navi.html
 * サーバーなしで開けるプレビュー・配布用（Service Worker やホーム画面追加は使わない）。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}dist-standalone/`
let html = readFileSync(`${outDir}index.html`, 'utf8')

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, file) => {
  return `<style>${readFileSync(`${outDir}${file}`, 'utf8')}</style>`
})
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, file) => {
  // インライン化した JS の中の </script> で HTML が途切れないようにする
  const js = readFileSync(`${outDir}${file}`, 'utf8').replace(/<\/(script)/gi, '<\\/$1')
  return `<script type="module">${js}</script>`
})
const icon = readFileSync(`${root}public/icons/icon.svg`, 'utf8')
html = html
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, '')
  .replace(
    /<link rel="icon"[^>]*>/,
    `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(icon)}" />`,
  )

if (/src="\.\/assets|href="\.\/assets/.test(html)) {
  throw new Error('インライン化できなかった参照が残っています')
}
const target = `${outDir}tachibana-campus-navi.html`
writeFileSync(target, html)
console.log(`wrote ${target} (${Math.round(html.length / 1024)} KB)`)

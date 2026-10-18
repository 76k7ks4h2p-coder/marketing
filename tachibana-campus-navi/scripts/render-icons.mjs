/**
 * public/icons/icon.svg から PWA 用の PNG アイコンを作る（アイコンを変えたときだけ実行）。
 *   node scripts/render-icons.mjs
 * Playwright（Chromium）で SVG を描画して保存する。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  // グローバルにインストールされた playwright を使う
  ;({ chromium } = createRequire(`${process.execPath}/../../lib/node_modules/`)('playwright'))
}

const iconsDir = fileURLToPath(new URL('../public/icons/', import.meta.url))
const svg = readFileSync(`${iconsDir}icon.svg`, 'utf8')

const outputs = [
  { file: 'icon-192.png', size: 192, padding: 0, background: 'transparent' },
  { file: 'icon-512.png', size: 512, padding: 0, background: 'transparent' },
  // マスカブルアイコンは安全領域（中央 80%）に収める
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1, background: '#c2410c' },
  { file: 'apple-touch-icon.png', size: 180, padding: 0, background: '#c2410c' },
]

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const o of outputs) {
  const inner = Math.round(o.size * (1 - o.padding * 2))
  await page.setViewportSize({ width: o.size, height: o.size })
  await page.setContent(
    `<html><body style="margin:0;background:${o.background};display:grid;place-items:center;width:${o.size}px;height:${o.size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  )
  await page.screenshot({
    path: `${iconsDir}${o.file}`,
    omitBackground: o.background === 'transparent',
  })
  console.log(`wrote ${o.file}`)
}
await browser.close()

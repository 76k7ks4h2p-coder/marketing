/**
 * 実ブラウザでの動作確認（スモークテスト）。開発サーバーかプレビューを起動してから実行する。
 *   pnpm dev            （別ターミナル）
 *   pnpm smoke http://localhost:5173/ [スクリーンショットの保存先]
 *
 * Playwright はこのプロジェクトの依存には入れていない（重いため）。
 * グローバル、または一時的に（npx -p playwright）インストールされたものを使う。
 */
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = createRequire(`${process.execPath}/../../lib/node_modules/`)('playwright'))
}

const base = process.argv[2] ?? 'http://localhost:5173/'
const out = process.argv[3]
if (out) mkdirSync(out, { recursive: true })

const failures = []
const errors = []
function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failures.push(label)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const shot = (name) => (out ? page.screenshot({ path: `${out}/${name}.png` }) : null)

await page.goto(base)
const input = page.getByRole('combobox', { name: '教室番号・建物名・施設名で検索' })
await input.waitFor()
await shot('01-home')

// 開発指示書 §8 の必須確認
const required = [
  ['111', '清和館・1階'],
  ['2202', 'mican・2階'],
  ['A201', '清優館・2階'],
  ['G001', '啓成館・地下1階'],
  ['H301', 'アカデミックリンクス・3階'],
  ['J804', 'アカデミックテラス・8階'],
]
for (const [code, location] of required) {
  await input.fill(code)
  await input.press('Enter')
  const article = page.getByRole('article')
  await article.waitFor()
  const text = await article.textContent()
  check(`${code} → ${location}`, text.includes(location) && text.includes(code))
}
await shot('02-room-detail')

await input.fill('ｈ－３０１')
await input.press('Enter')
check(
  '全角・ハイフン入りの「ｈ－３０１」でも H301',
  (await page.getByRole('article').textContent()).includes('H301'),
)

await input.fill('H3')
const options = await page.getByRole('option').allTextContents()
check('入力途中「H3」で H301・H302 を候補表示', options.length === 2)
await shot('03-incremental')

await input.fill('Z999')
check(
  '存在しない番号は「見つかりませんでした」',
  await page.getByText(/見つかりませんでした/).isVisible(),
)
await input.fill('F404')
check(
  '公式一覧にない番号は「見つかりません」＋建物の案内',
  await page.getByText(/公式教室一覧のデータに見つかりません/).isVisible(),
)
await shot('04-not-found')

await input.fill('J804')
await input.press('Enter')
await page
  .getByRole('article')
  .getByRole('button', { name: /ここへ行く/ })
  .click()
check(
  '経路データがないとき道順を出さない',
  await page.getByText('道順はまだ表示できません').isVisible(),
)
check(
  '推測の経路を出していない',
  (await page.getByText(/検証済みの通路で案内します/).count()) === 0,
)
await shot('05-route')

await input.fill('G001')
await input.press('Enter')
await page
  .getByRole('article')
  .getByRole('button', { name: /お気に入り/ })
  .click()
await page.reload()
await input.waitFor()
await page.getByRole('navigation').getByRole('button', { name: 'お気に入り' }).click()
check(
  '再読み込み後もお気に入りが残る',
  await page.getByText('G001 生理機能実習室').first().isVisible(),
)
await shot('06-favorites')

check('コンソールエラーがない', errors.length === 0)
if (errors.length) console.log(errors.join('\n'))
await browser.close()

if (failures.length) {
  console.error(`\n${failures.length} 件の確認に失敗しました`)
  process.exit(1)
}
console.log('\nすべての確認に成功しました')

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App.tsx'
import { mockDataFetch } from './helpers.ts'

async function renderApp() {
  const user = userEvent.setup()
  const utils = render(<App />)
  const input = await screen.findByRole('combobox', {}, { timeout: 3000 })
  return { user, input, ...utils }
}

describe('教室番号を入力して、建物と階を表示する', () => {
  it.each([
    ['111', '111教室', '清和館・1階'],
    ['2202', '2202 CAD教室', 'mican・2階'],
    ['A201', 'A201教室', '清優館・2階'],
    ['G001', 'G001 生理機能実習室', '啓成館・地下1階'],
    ['H301', 'H301教室', 'アカデミックリンクス・3階'],
    ['J804', 'J804 Media Lab3', 'アカデミックテラス・8階'],
  ])('%s → %s（%s）', async (code, title, location) => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, code)
    await user.keyboard('{Enter}')

    const detail = await screen.findByRole('article')
    expect(within(detail).getByRole('heading', { level: 2 }).textContent).toBe(title)
    expect(within(detail).getByText(location)).toBeTruthy()
    expect(within(detail).getByText('照合済み')).toBeTruthy()
    // 共有できる URL になっている
    expect(window.location.search).toBe(`?room=${code}`)
  })

  it('入力途中から候補を表示し、表記揺れ（全角・小文字）でも見つかる', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'ｈ３')
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('H301教室'),
      expect.stringContaining('H302教室'),
    ])
  })

  it('建物番号と地図上の位置（未登録の明示）を表示する', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'H301{Enter}')
    const detail = await screen.findByRole('article')
    expect(within(detail).getByText('建物番号').nextElementSibling?.textContent).toBe('H')
    expect(within(detail).getByText('このアプリには未登録')).toBeTruthy()
    expect(within(detail).getByRole('link', { name: /公式キャンパスマップで確認/ })).toBeTruthy()
    expect(within(detail).getByRole('button', { name: /地図で見る/ })).toBeTruthy()
    expect(within(detail).getByRole('button', { name: /ここへ行く/ })).toBeTruthy()
  })
})

describe('見つからない教室番号', () => {
  it('建物記号が不明な番号は「見つかりません」と案内する', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'Z999')
    expect(
      await screen.findByText(/「Z999」に一致する教室・建物・施設は見つかりませんでした/),
    ).toBeTruthy()
  })

  it('公式一覧にない番号は、建物と階を「確認できません」と明示する', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'F404')
    expect(await screen.findByText(/「F404」は公式教室一覧のデータに見つかりません/)).toBeTruthy()
    expect(screen.getByText(/公式一覧に掲載がないため確認できません/)).toBeTruthy()
  })

  it('URL で存在しない教室を開いても画面が壊れない', async () => {
    window.history.replaceState(null, '', '/?room=Q123')
    mockDataFetch()
    await renderApp()
    expect(
      await screen.findByText(/「Q123」に一致する教室・建物・施設は見つかりませんでした/),
    ).toBeTruthy()
  })
})

describe('建物・階別の教室一覧', () => {
  it('建物を選ぶと階が並び、階を選ぶとその階の教室が見える', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'アカデミックリンクス{Enter}')
    const detail = await screen.findByRole('article')
    const tabs = within(detail).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent?.slice(0, 2))).toEqual([
      '1F',
      '2F',
      '3F',
      '4F',
      '5F',
      '6F',
    ])
    await user.click(within(detail).getByRole('tab', { name: /4F/ }))
    const panel = within(detail).getByRole('tabpanel')
    const codes = within(panel)
      .getAllByRole('button')
      .map((b) => b.textContent?.match(/^H\d{3}/)?.[0])
      .filter(Boolean)
    expect(codes).toEqual(['H401', 'H402', 'H403'])
  })

  it('地図（建物一覧）から建物を選ぶと詳細が開く', async () => {
    mockDataFetch()
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: /啓成館/ }))
    const detail = await screen.findByRole('article')
    expect(within(detail).getByRole('heading', { level: 2 }).textContent).toBe('啓成館')
    expect(within(detail).getAllByRole('tab')[0]?.textContent).toContain('B1')
  })
})

describe('経路案内は存在しない経路を案内しない', () => {
  it('検証済みの通路データがないので、道順を出さずに建物と階を案内する', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'J804{Enter}')
    await user.click(await screen.findByRole('button', { name: /ここへ行く/ }))
    expect(await screen.findByText('道順はまだ表示できません')).toBeTruthy()
    expect(screen.queryByText(/検証済みの通路で案内します/)).toBeNull()
    expect(screen.getByText('アカデミックテラス（建物番号 J）')).toBeTruthy()
    expect(screen.getByText('8階')).toBeTruthy()

    await user.click(screen.getByRole('checkbox', { name: /バリアフリー/ }))
    expect(screen.getByText(/安全なバリアフリー経路は保証できません/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /公式バリアフリーマップ/ }).getAttribute('href')).toBe(
      'https://www.tachibana-u.ac.jp/about/campus/pdf/2026_accessibility.pdf',
    )
  })
})

describe('お気に入りと履歴（端末内に保存）', () => {
  it('ページを読み込み直してもお気に入りが残る', async () => {
    mockDataFetch()
    const first = await renderApp()
    await first.user.type(first.input, 'G001{Enter}')
    const fav = await screen.findByRole('button', { name: /お気に入り/, pressed: false })
    await first.user.click(fav)
    expect(screen.getByRole('button', { name: /お気に入り済み/, pressed: true })).toBeTruthy()
    first.unmount()

    // 再読み込み（新しくマウント）
    window.history.replaceState(null, '', '/')
    mockDataFetch()
    const second = await renderApp()
    await second.user.click(screen.getByRole('button', { name: 'お気に入り' }))
    const list = await screen.findByRole('heading', { name: 'お気に入り' })
    expect(list.parentElement?.textContent).toContain('G001 生理機能実習室')
  })

  it('検索した教室が「最近の検索」に残り、消すこともできる', async () => {
    mockDataFetch()
    const { user, input } = await renderApp()
    await user.type(input, 'H301{Enter}')
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await user.click(screen.getByRole('button', { name: '検索' }))
    await user.click(screen.getByRole('button', { name: '検索語を消す' }))
    expect(await screen.findByRole('button', { name: 'H301' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '履歴を消す' }))
    expect(screen.queryByRole('button', { name: 'H301' })).toBeNull()
  })

  it('端末に保存できない環境でも動く', async () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      mockDataFetch()
      const { user, input } = await renderApp()
      await user.type(input, 'A201{Enter}')
      await user.click(await screen.findByRole('button', { name: /お気に入り/, pressed: false }))
      expect(screen.getByRole('button', { name: /お気に入り済み/ })).toBeTruthy()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('データ取得の失敗', () => {
  it('教室データが取れないときはエラーと再読み込みボタンを出す', async () => {
    mockDataFetch({ fail: ['rooms.json'] })
    render(<App />)
    expect(await screen.findByText('教室・建物のデータを読み込めませんでした。')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'もう一度読み込む' })).toBeTruthy()
  })

  it('経路データなど一部が取れなくても、教室検索は使える', async () => {
    mockDataFetch({ fail: ['route-graph.json', 'facilities.json'] })
    const { user, input } = await renderApp()
    expect(screen.getByRole('alert').textContent).toContain('一部のデータ')
    await user.type(input, 'H301{Enter}')
    expect((await screen.findByRole('article')).textContent).toContain('アカデミックリンクス・3階')
  })
})

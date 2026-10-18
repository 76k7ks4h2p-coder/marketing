import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root が見つかりません')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// オフラインでも開けるように Service Worker を登録（本番ビルドのみ。単体 HTML 版は不要）
if (import.meta.env.PROD && import.meta.env.MODE !== 'standalone' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.warn('Service Worker を登録できませんでした', error)
    })
  })
}

import type { Metadata, Viewport } from 'next'

import { SERVICE_NAME, SERVICE_TAGLINE, SERVICE_AREA_LABEL } from '@/lib/constants/service'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${SERVICE_NAME}｜${SERVICE_TAGLINE}`,
    template: `%s｜${SERVICE_NAME}`,
  },
  description: `${SERVICE_AREA_LABEL}の不動産オーナー向け。空室クリーニング・共用部清掃・草刈り・物件巡回・軽微な修繕の見積もりを比較して発注できるサービスです。`,
  robots: {
    // MVP 段階のため検索エンジンには登録しない
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1d5566',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}

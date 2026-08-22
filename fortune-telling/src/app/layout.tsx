import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: '生まれ星占い｜生年月日・出生地・出生時刻でみる四柱推命',
  description:
    '生年月日・出生地・出生時刻を入力するだけで、四柱推命ベースのあなたの性格・運気を占います。',
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#150f28',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* next/font/google はこのフォントの日本語サブセットを提供していないため、通常のstylesheetリンクで読み込む */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}

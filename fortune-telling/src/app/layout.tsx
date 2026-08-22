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
  themeColor: '#4d2472',
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

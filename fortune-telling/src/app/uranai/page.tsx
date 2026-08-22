import type { Metadata } from 'next'

import UranaiClient from './UranaiClient'

export const metadata: Metadata = {
  title: '占ってみる',
  description:
    '生年月日・出生地・出生時刻を入力するだけで、四柱推命ベースのあなたの性格・運気を占います。',
}

export default function UranaiPage() {
  return <UranaiClient />
}

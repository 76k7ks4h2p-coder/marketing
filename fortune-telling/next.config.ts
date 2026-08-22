import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // このアプリのディレクトリをワークスペースルートとして明示し、
    // 隣接する OwnerBase アプリ(親ディレクトリの src/)を誤って巻き込まないようにする。
    root: process.cwd(),
  },
}

export default nextConfig

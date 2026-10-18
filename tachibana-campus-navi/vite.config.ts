import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { serviceWorkerPlugin } from './scripts/vite-plugin-sw.ts'
import { DATA_FILES } from './src/domain/assemble.ts'

const root = import.meta.dirname

/** 単体 HTML 版に埋め込むため、public/data/*.json をまとめて読む */
function readDataFiles(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(DATA_FILES).map(([key, file]) => [
      key,
      JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf8')),
    ]),
  )
}

export default defineConfig(({ mode }) => {
  // pnpm build:standalone … データまで 1 ファイルに入れた配布・プレビュー用の HTML を作る
  const standalone = mode === 'standalone'
  return {
    // 相対パスで出力し、GitHub Pages などのサブパスにもそのまま置けるようにする
    base: './',
    plugins: [react(), tailwindcss(), ...(standalone ? [] : [serviceWorkerPlugin()])],
    define: {
      __TCN_EMBEDDED_DATA__: standalone ? JSON.stringify(readDataFiles()) : 'undefined',
    },
    build: standalone
      ? {
          target: 'es2022',
          outDir: 'dist-standalone',
          copyPublicDir: false,
          rollupOptions: {
            input: resolve(root, 'index.html'),
            output: { inlineDynamicImports: true },
          },
        }
      : {
          target: 'es2022',
          rollupOptions: {
            input: {
              main: resolve(root, 'index.html'),
              editor: resolve(root, 'editor.html'),
            },
          },
        },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
      restoreMocks: true,
    },
  }
})

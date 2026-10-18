import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'

const TEMPLATE_PATH = new URL('./sw-template.js', import.meta.url)

/** 出力ディレクトリ内のファイルを再帰的に列挙する（区切り文字は / に統一） */
function listFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

/**
 * ビルド後の成果物一覧からオフライン用の Service Worker（sw.js）を生成する。
 * 依存パッケージを増やさないため、プリキャッシュ一覧の埋め込みだけを行う小さなプラグイン。
 */
export function serviceWorkerPlugin(): Plugin {
  return {
    name: 'tcn-service-worker',
    apply: 'build',
    writeBundle: {
      sequential: true,
      order: 'post',
      handler(options) {
        const outDir = options.dir
        if (!outDir) return
        const files = listFiles(outDir)
          .map((file) => relative(outDir, file).split(sep).join('/'))
          // 保守用の配置エディタはオフライン対象にしない
          .filter(
            (file) =>
              file !== 'sw.js' &&
              !file.endsWith('.map') &&
              file !== 'editor.html' &&
              !file.startsWith('assets/editor-'),
          )
          .sort()

        const hash = createHash('sha256')
        for (const file of files) {
          hash.update(file)
          hash.update(readFileSync(join(outDir, file)))
        }
        const version = hash.digest('hex').slice(0, 12)
        const precache = ['./', ...files.map((file) => `./${file}`)]

        const source = readFileSync(TEMPLATE_PATH, 'utf8')
          .replace('__SW_VERSION__', version)
          .replace('__SW_PRECACHE__', JSON.stringify(precache, null, 2))
        writeFileSync(join(outDir, 'sw.js'), source)
      },
    },
  }
}

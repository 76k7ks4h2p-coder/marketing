import { describe, expect, it } from 'vitest'

import { MAX_FILES_PER_REQUEST, MAX_FILE_SIZE_BYTES } from '@/lib/constants/files'
import {
  buildStoragePath,
  extensionOf,
  isExtensionAllowed,
  isFileSizeAllowed,
  isMimeAndExtensionConsistent,
  isMimeTypeAllowed,
  isValidStoragePath,
  validateFileCount,
  validateUploadFile,
  validateUploadFiles,
} from '@/lib/validation/file'

const OWNER_ID = '11111111-1111-4111-8111-111111111111'
const REQUEST_ID = '22222222-2222-4222-8222-222222222222'
const FILE_ID = '33333333-3333-4333-8333-333333333333'

describe('MIME タイプ検証', () => {
  it('許可された形式を受け付ける', () => {
    expect(isMimeTypeAllowed('image/jpeg')).toBe(true)
    expect(isMimeTypeAllowed('image/png')).toBe(true)
    expect(isMimeTypeAllowed('image/webp')).toBe(true)
    expect(isMimeTypeAllowed('application/pdf')).toBe(true)
  })

  it('許可されていない形式を拒否する', () => {
    expect(isMimeTypeAllowed('image/gif')).toBe(false)
    expect(isMimeTypeAllowed('image/svg+xml')).toBe(false)
    expect(isMimeTypeAllowed('application/zip')).toBe(false)
    expect(isMimeTypeAllowed('text/html')).toBe(false)
    expect(isMimeTypeAllowed('')).toBe(false)
  })
})

describe('拡張子検証', () => {
  it('拡張子を小文字で取り出す', () => {
    expect(extensionOf('photo.JPG')).toBe('jpg')
    expect(extensionOf('report.pdf')).toBe('pdf')
  })

  it('拡張子が無い場合は空文字を返す', () => {
    expect(extensionOf('noextension')).toBe('')
    expect(extensionOf('.hidden')).toBe('')
    expect(extensionOf('trailingdot.')).toBe('')
  })

  it('許可された拡張子を受け付ける', () => {
    expect(isExtensionAllowed('a.jpg')).toBe(true)
    expect(isExtensionAllowed('a.jpeg')).toBe(true)
    expect(isExtensionAllowed('a.png')).toBe(true)
    expect(isExtensionAllowed('a.webp')).toBe(true)
    expect(isExtensionAllowed('a.pdf')).toBe(true)
  })

  it('許可されていない拡張子を拒否する', () => {
    expect(isExtensionAllowed('a.gif')).toBe(false)
    expect(isExtensionAllowed('a.exe')).toBe(false)
    expect(isExtensionAllowed('a.svg')).toBe(false)
  })
})

describe('MIME タイプと拡張子の整合性', () => {
  it('組み合わせが一致していれば通す', () => {
    expect(isMimeAndExtensionConsistent('image/jpeg', 'photo.jpg')).toBe(true)
    expect(isMimeAndExtensionConsistent('image/jpeg', 'photo.jpeg')).toBe(true)
    expect(isMimeAndExtensionConsistent('application/pdf', 'quote.pdf')).toBe(true)
  })

  it('拡張子だけ差し替えた偽装を拒否する', () => {
    // 実体は PDF だが拡張子だけ png にしたケース
    expect(isMimeAndExtensionConsistent('application/pdf', 'malicious.png')).toBe(false)
    expect(isMimeAndExtensionConsistent('image/png', 'photo.jpg')).toBe(false)
  })
})

describe('ファイルサイズ検証', () => {
  it('上限以内なら許可する', () => {
    expect(isFileSizeAllowed(1024)).toBe(true)
    expect(isFileSizeAllowed(MAX_FILE_SIZE_BYTES)).toBe(true)
  })

  it('上限を超えたら拒否する', () => {
    expect(isFileSizeAllowed(MAX_FILE_SIZE_BYTES + 1)).toBe(false)
  })

  it('空ファイルは拒否する', () => {
    expect(isFileSizeAllowed(0)).toBe(false)
  })
})

describe('validateUploadFile', () => {
  it('正しいファイルは通る', () => {
    expect(validateUploadFile({ name: 'a.jpg', type: 'image/jpeg', size: 1024 })).toEqual({
      ok: true,
    })
  })

  it('未対応形式は日本語のメッセージを返す', () => {
    const result = validateUploadFile({ name: 'a.gif', type: 'image/gif', size: 1024 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('対応していない形式')
  })

  it('サイズ超過は日本語のメッセージを返す', () => {
    const result = validateUploadFile({
      name: 'a.jpg',
      type: 'image/jpeg',
      size: MAX_FILE_SIZE_BYTES + 1,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('10MB')
  })

  it('MIME と拡張子の不一致を検出する', () => {
    const result = validateUploadFile({ name: 'a.png', type: 'image/jpeg', size: 1024 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('一致していません')
  })
})

describe('ファイル数検証', () => {
  it('上限以内なら許可する', () => {
    expect(validateFileCount(MAX_FILES_PER_REQUEST)).toEqual({ ok: true })
  })

  it('上限を超えたら拒否する', () => {
    const result = validateFileCount(MAX_FILES_PER_REQUEST + 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('5件まで')
  })

  it('まとめて検証する場合も件数上限を守る', () => {
    const files = Array.from({ length: 6 }, (_, index) => ({
      name: `a${index}.jpg`,
      type: 'image/jpeg',
      size: 1024,
    }))
    expect(validateUploadFiles(files).ok).toBe(false)
  })

  it('5 件までなら通る', () => {
    const files = Array.from({ length: 5 }, (_, index) => ({
      name: `a${index}.jpg`,
      type: 'image/jpeg',
      size: 1024,
    }))
    expect(validateUploadFiles(files).ok).toBe(true)
  })
})

describe('Storage パスの生成と検証', () => {
  it('依頼写真のパスを仕様どおりに組み立てる', () => {
    const path = buildStoragePath({
      ownerId: OWNER_ID,
      requestId: REQUEST_ID,
      kind: 'request',
      fileId: FILE_ID,
      extension: 'jpg',
    })
    expect(path).toBe(`owner/${OWNER_ID}/requests/${REQUEST_ID}/request/${FILE_ID}.jpg`)
  })

  it('完了写真のパスを仕様どおりに組み立てる', () => {
    const path = buildStoragePath({
      ownerId: OWNER_ID,
      requestId: REQUEST_ID,
      kind: 'completion',
      fileId: FILE_ID,
      extension: 'PNG',
    })
    expect(path).toBe(`owner/${OWNER_ID}/requests/${REQUEST_ID}/completion/${FILE_ID}.png`)
  })

  it('元のファイル名はパスに含めない', () => {
    const path = buildStoragePath({
      ownerId: OWNER_ID,
      requestId: REQUEST_ID,
      kind: 'request',
      fileId: FILE_ID,
      extension: 'jpg',
    })
    expect(path).not.toContain('個人情報')
    expect(path).not.toContain('original')
  })

  it('パストラバーサルを含む値を拒否する', () => {
    expect(() =>
      buildStoragePath({
        ownerId: '../../etc',
        requestId: REQUEST_ID,
        kind: 'request',
        fileId: FILE_ID,
        extension: 'jpg',
      }),
    ).toThrow('STORAGE_PATH_INVALID')
  })

  it('許可されていない拡張子のパスを拒否する', () => {
    expect(() =>
      buildStoragePath({
        ownerId: OWNER_ID,
        requestId: REQUEST_ID,
        kind: 'request',
        fileId: FILE_ID,
        extension: 'exe',
      }),
    ).toThrow('STORAGE_PATH_INVALID')
  })

  it('不正な形式のパスは検証で弾かれる', () => {
    expect(isValidStoragePath('owner/../secret.jpg')).toBe(false)
    expect(isValidStoragePath(`owner/${OWNER_ID}/requests/${REQUEST_ID}/request/../x.jpg`)).toBe(
      false,
    )
    expect(
      isValidStoragePath(`owner/${OWNER_ID}/requests/${REQUEST_ID}/other/${FILE_ID}.jpg`),
    ).toBe(false)
    expect(isValidStoragePath(`${OWNER_ID}/${REQUEST_ID}/${FILE_ID}.jpg`)).toBe(false)
    expect(isValidStoragePath('')).toBe(false)
  })

  it('正しい形式のパスは検証を通る', () => {
    expect(
      isValidStoragePath(`owner/${OWNER_ID}/requests/${REQUEST_ID}/request/${FILE_ID}.jpg`),
    ).toBe(true)
    expect(
      isValidStoragePath(`owner/${OWNER_ID}/requests/${REQUEST_ID}/completion/${FILE_ID}.pdf`),
    ).toBe(true)
  })
})

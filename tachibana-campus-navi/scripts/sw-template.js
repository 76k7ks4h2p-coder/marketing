/* Tachibana Campus Navi — Service Worker（vite-plugin-sw.ts がビルド時に生成） */
const VERSION = '__SW_VERSION__'
const CACHE_NAME = `tcn-${VERSION}`
const PRECACHE = __SW_PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('tcn-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/** ネットワーク優先。失敗したらキャッシュを返す（教室データの更新をすぐ反映するため） */
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ??
      (fallbackUrl ? await cache.match(fallbackUrl) : undefined)
    if (cached) return cached
    throw error
  }
}

/** キャッシュ優先（ファイル名にハッシュが付くビルド成果物向け） */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, new URL('./index.html', self.registration.scope).href))
    return
  }
  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request))
    return
  }
  event.respondWith(cacheFirst(request))
})

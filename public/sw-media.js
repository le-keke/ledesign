/**
 * Cache-first for images during (and across) visits.
 * Vercel Blob detail images, and same-origin covers (hashed /_astro assets).
 * Videos are left alone — Range requests break if a full response is cached.
 */
const CACHE = 'lede-images-v2';
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  const isImage = IMAGE_RE.test(url.pathname);
  const isBlob = BLOB_HOST_RE.test(url.hostname);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isImage || (!isBlob && !isSameOrigin)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;

      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') {
        cache.put(req, res.clone());
      }
      return res;
    }),
  );
});

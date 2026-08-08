/**
 * Cache-first for Vercel Blob images during (and across) visits.
 * Videos are left alone — Range requests break if a full response is cached.
 */
const CACHE = 'lede-blob-images-v1';
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

  if (!BLOB_HOST_RE.test(url.hostname) || !IMAGE_RE.test(url.pathname)) return;

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

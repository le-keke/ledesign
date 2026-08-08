/**
 * Session navigation cache for Astro ClientRouter:
 * - Reuse already-fetched HTML when revisiting a URL in this tab
 * - In production, register a SW that cache-firsts Vercel Blob images
 */

declare global {
  interface Window {
    __ledeSessionNavCache?: boolean;
  }
}

function cacheKey(url: URL) {
  return `${url.origin}${url.pathname}${url.search}`;
}

function documentToHtml(doc: Document) {
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

export function installSessionNavCache() {
  if (typeof window === 'undefined' || window.__ledeSessionNavCache) return;
  window.__ledeSessionNavCache = true;

  const pages = new Map<string, string>();
  const parser = new DOMParser();

  document.addEventListener('astro:before-preparation', (event) => {
    const key = cacheKey(event.to);
    const originalLoader = event.loader;

    event.loader = async () => {
      const cached = pages.get(key);
      if (cached) {
        event.newDocument = parser.parseFromString(cached, 'text/html');
        event.newDocument.querySelectorAll('noscript').forEach((el) => el.remove());
        return;
      }

      await originalLoader();
      if (!event.defaultPrevented) {
        pages.set(key, documentToHtml(event.newDocument));
      }
    };
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw-media.js').catch(() => {
      /* ignore registration failures (private mode, etc.) */
    });
  }
}

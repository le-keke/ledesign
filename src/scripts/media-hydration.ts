/**
 * ClientRouter swaps DOM without a full reload (project clicks).
 * Chrome often leaves newly inserted <video autoplay muted> blank until refresh.
 * Fix: remount each <video> once as a fresh element, then load()+play().
 *
 * Locale links use data-astro-reload (full navigation) so they don't need this.
 */

declare global {
  interface Window {
    __ledeMediaHydration?: boolean;
  }
}

function tryPlay(video: HTMLVideoElement) {
  if (video.paused) void video.play().catch(() => {});
}

function remountVideo(video: HTMLVideoElement) {
  // Already remounted this navigation — only retry play.
  if (video.dataset.mediaHydrated === '1') {
    video.muted = true;
    tryPlay(video);
    return;
  }

  const src = video.getAttribute('src') || video.currentSrc;
  if (!src) return;

  const next = document.createElement('video');
  for (const attr of video.attributes) {
    next.setAttribute(attr.name, attr.value);
  }
  next.setAttribute('src', src);
  next.dataset.mediaHydrated = '1';
  // Chrome requires these as JS properties after ClientRouter insertion.
  next.muted = true;
  next.defaultMuted = true;
  next.playsInline = true;
  next.autoplay = true;
  next.loop = video.hasAttribute('loop') || video.loop;

  video.replaceWith(next);

  try {
    next.load();
  } catch {
    /* ignore */
  }

  tryPlay(next);
  next.addEventListener('loadeddata', () => tryPlay(next), { once: true });
  next.addEventListener('canplay', () => tryPlay(next), { once: true });
}

function hydrateVideos(root: ParentNode = document) {
  [...root.querySelectorAll('video')].forEach((video) => remountVideo(video));
}

function hydrateImages(root: ParentNode = document) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.loading === 'lazy') img.loading = 'eager';
    if (img.complete && img.naturalWidth > 0) return;
    const src = img.getAttribute('src');
    if (!src) return;
    img.setAttribute('src', src);
  });
}

function hydrate() {
  hydrateVideos();
  hydrateImages();
}

function hydrateWithRetries() {
  hydrate();
  requestAnimationFrame(hydrate);
  window.setTimeout(hydrate, 120);
  window.setTimeout(hydrate, 500);
}

export function installMediaHydration() {
  if (typeof window === 'undefined' || window.__ledeMediaHydration) return;
  window.__ledeMediaHydration = true;

  document.addEventListener('astro:page-load', hydrateWithRetries);
  document.addEventListener('astro:after-swap', hydrateWithRetries);
}

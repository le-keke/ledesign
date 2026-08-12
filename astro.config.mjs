import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: replace with the production domain before launch.
const site = 'https://lekekedesign.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['zh', 'en', 'ja'],
    routing: { prefixDefaultLocale: true },
  },
  /* `/` is handled by src/pages/index.astro (localStorage → locale). */
  devToolbar: { enabled: false },
  vite: {
    server: {
      // Phone / LAN preview (same Wi-Fi). Dev only — production is static.
      allowedHosts: true,
      // Safari/Chrome otherwise keep stale CSS across HMR; force revalidate in dev.
      headers: {
        'Cache-Control': 'no-store',
      },
    },
    build: {
      // Lightning CSS derives its targets from this. Left unset it emits media
      // query range syntax ("width <= 1067.98px"), which older Safari ignores
      // outright — the whole responsive system would silently fail there.
      cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'],
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { zh: 'zh-CN', en: 'en', ja: 'ja-JP' },
      },
    }),
  ],
});

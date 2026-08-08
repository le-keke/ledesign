import { defineMiddleware } from 'astro:middleware';

/** Dev only: stop Safari/Chrome from serving a stale HTML shell after CSS edits. */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (import.meta.env.DEV) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
});

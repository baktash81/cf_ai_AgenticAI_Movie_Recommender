/** Edge cache helper for read-heavy GET endpoints */
export async function cachedJsonResponse(
  request: Request,
  ttlSeconds: number,
  build: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await build();
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
    const toCache = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    await cache.put(cacheKey, toCache.clone());
    return toCache;
  }

  return response;
}

import { describe, expect, it } from 'vitest';
import { getSiteUrl } from '../helpers/client';

const SITE_URL = getSiteUrl();

describe('production site smoke', () => {
  it('homepage returns 200 and contains MovieMind', async () => {
    const res = await fetch(SITE_URL);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('MovieMind');
    expect(html).toContain('id="root"');
  });

  it('SPA routes serve index.html', async () => {
    for (const path of ['/', '/login', '/discover', '/chat', '/watchlist', '/collections']) {
      const res = await fetch(`${SITE_URL}${path}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('MovieMind');
    }
  });

  it('loads main JS bundle from index.html', async () => {
    const html = await fetch(SITE_URL).then((r) => r.text());
    const match = html.match(/src="(\/assets\/[^"]+\.js)"/);
    expect(match).toBeTruthy();
    const jsRes = await fetch(`${SITE_URL}${match![1]}`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get('content-type')).toMatch(/javascript/);
  });

  it('loads main CSS bundle', async () => {
    const html = await fetch(SITE_URL).then((r) => r.text());
    const match = html.match(/href="(\/assets\/[^"]+\.css)"/);
    expect(match).toBeTruthy();
    const cssRes = await fetch(`${SITE_URL}${match![1]}`);
    expect(cssRes.status).toBe(200);
  });

  it('proxied API works through site origin', async () => {
    const res = await fetch(`${SITE_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('HTTP redirects to HTTPS', async () => {
    const res = await fetch(`http://movie.baktashans.com/`, { redirect: 'manual' });
    expect([301, 302, 308]).toContain(res.status);
    expect(res.headers.get('location')).toMatch(/^https:\/\//);
  });
});

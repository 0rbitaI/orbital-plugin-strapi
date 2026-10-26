const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const Module = require('node:module');
const path = require('node:path');
const compiled = buildSync({ entryPoints: [path.join(__dirname, '../server/src/news.ts')], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false }).outputFiles[0].text;
const loaded = new Module(path.join(__dirname, 'news.cjs'), module);
loaded.filename = path.join(__dirname, 'news.cjs');
loaded.paths = module.paths;
loaded._compile(compiled, loaded.filename);
const { createNewsService, FRESH_MS, STALE_MS, RETRY_MS, projectSlug, trackedUrl, parseArticles, plainText } = loaded.exports;
const post = { id: 1, date_gmt: '2026-10-22T20:00:07', link: 'https://blog.orbital.company/article/?keep=yes#section', title: { rendered: '<span>Title &amp; text</span>' }, excerpt: { rendered: '<p>Hello <strong>world</strong>&#8230;</p><script>bad()</script>' } };
const response = (posts = [post]) => new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json' } });

test('normalizes project IDs and preserves query parameters and fragments', () => {
  assert.equal(projectSlug('  São Paulo / Cliente 123 '), 'sao-paulo-cliente-123');
  assert.throws(() => projectSlug('!!!'));
  const url = new URL(trackedUrl(post.link, 'São Paulo', 'article'));
  assert.equal(url.searchParams.get('keep'), 'yes');
  assert.equal(url.hash, '#section');
  assert.equal(url.searchParams.get('utm_source'), 'sao-paulo');
  assert.equal(url.searchParams.get('utm_medium'), 'strapi_dashboard');
  assert.equal(url.searchParams.get('utm_campaign'), 'orbital_blog');
  assert.equal(url.searchParams.get('utm_content'), 'article');
  assert.equal(new URL(trackedUrl('https://blog.orbital.company/?utm_source=old', 'Client', 'view_all')).searchParams.get('utm_source'), 'client');
  assert.throws(() => trackedUrl('https://evil.example/', 'client', 'article'));
  assert.throws(() => trackedUrl('javascript:alert(1)', 'client', 'article'));
});
test('returns at most four articles, with plain text and short excerpts', () => {
  const articles = parseArticles(Array(6).fill(post), 'client');
  assert.equal(articles.length, 4);
  assert.equal(articles[0].title, 'Title & text');
  assert.equal(articles[0].excerpt, 'Hello world…');
  assert.equal(articles[0].date, '2026-10-22T20:00:07.000Z');
  assert.equal(plainText('a'.repeat(200), 180).length, 180);
  assert.throws(() => parseArticles({ error: true }, 'client'));
  assert.throws(() => parseArticles([{ ...post, date_gmt: 'invalid' }], 'client'));
});
test('fetches only published posts and needed fields; caches for six hours', async () => {
  let time = 1000, calls = 0;
  const service = createNewsService('Client', { now: () => time, fetch: async (url, options) => {
    calls++;
    assert.equal(url.origin, 'https://blog.orbital.company');
    assert.equal(url.searchParams.get('per_page'), '4');
    assert.equal(url.searchParams.get('status'), 'publish');
    assert.equal(url.searchParams.get('orderby'), 'date');
    assert.equal(url.searchParams.get('_fields'), 'id,date_gmt,link,title,excerpt');
    assert.equal(options.redirect, 'error');
    return response();
  } });
  assert.equal((await service.get()).articles.length, 1);
  time += FRESH_MS - 1;
  await service.get();
  assert.equal(calls, 1);
  time++;
  await service.get();
  assert.equal(calls, 2);
});
test('shares concurrent requests instead of duplicating origin fetches', async () => {
  let calls = 0;
  const service = createNewsService('client', { fetch: async () => { calls++; return response(); } });
  const values = await Promise.all(Array.from({ length: 10 }, () => service.get()));
  assert.equal(calls, 1);
  assert.ok(values.every(value => value.articles.length === 1));
});
test('origin failure serves stale data, backs off ten minutes and expires at seven days', async () => {
  let time = 0, fail = false, calls = 0;
  const service = createNewsService('client', { now: () => time, fetch: async () => {
    calls++; if (fail) throw new Error('offline'); return response();
  } });
  await service.get();
  fail = true;
  time = FRESH_MS;
  const stale = await service.get();
  assert.equal(stale.stale, true);
  assert.equal(stale.unavailable, false);
  assert.equal(stale.articles.length, 1);
  time += RETRY_MS - 1;
  await service.get();
  assert.equal(calls, 2);
  time++;
  await service.get();
  assert.equal(calls, 3);
  time = STALE_MS;
  const expired = await service.get();
  assert.equal(expired.unavailable, true);
  assert.deepEqual(expired.articles, []);
  fail = false;
  time += RETRY_MS;
  assert.equal((await service.get()).unavailable, false);
});
test('empty result is valid and replaces stale articles', async () => {
  let time = 0, empty = false;
  const service = createNewsService('client', { now: () => time, fetch: async () => response(empty ? [] : [post]) });
  await service.get(); empty = true; time = FRESH_MS;
  const result = await service.get();
  assert.deepEqual(result.articles, []);
  assert.equal(result.unavailable, false);
  assert.equal(result.stale, false);
});
test('cold failures and invalid JSON are contained and backed off', async () => {
  for (const fetcher of [async () => new Response('', { status: 503 }), async () => new Response('invalid'), async () => response([{ id: 1 }])]) {
    let calls = 0;
    const service = createNewsService('client', { fetch: async () => { calls++; return fetcher(); } });
    assert.equal((await service.get()).unavailable, true);
    await service.get();
    assert.equal(calls, 1);
  }
});
test('timeout aborts the origin and returns a contained error state', async () => {
  const service = createNewsService('client', { timeoutMs: 10, fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  assert.equal((await service.get()).unavailable, true);
});
test('destroy aborts an in-flight request', async () => {
  const service = createNewsService('client', { fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  const pending = service.get(); service.destroy();
  assert.equal((await pending).unavailable, true);
});

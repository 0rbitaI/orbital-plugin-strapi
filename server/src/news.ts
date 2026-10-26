import he from 'he';
import sanitizeHtml from 'sanitize-html';

export const BLOG_URL = 'https://blog.orbital.company/';
export const FRESH_MS = 6 * 60 * 60 * 1000;
export const STALE_MS = 7 * 24 * 60 * 60 * 1000;
export const RETRY_MS = 10 * 60 * 1000;
export const TIMEOUT_MS = 4000;

export interface Article { id: number; date: string; title: string; excerpt: string; url: string }
export interface News { articles: Article[]; viewAllUrl: string; stale: boolean; unavailable: boolean }

export function projectSlug(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Orbital News requires a projectId string');
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  if (!slug) throw new Error('Orbital News projectId must contain letters or numbers');
  return slug;
}

export function trackedUrl(value: string, projectId: string, content: 'article' | 'view_all'): string {
  const url = new URL(value);
  if (url.origin !== new URL(BLOG_URL).origin || url.username || url.password) {
    throw new Error('Unexpected article origin');
  }
  url.searchParams.set('utm_source', projectSlug(projectId));
  url.searchParams.set('utm_medium', 'strapi_dashboard');
  url.searchParams.set('utm_campaign', 'orbital_blog');
  url.searchParams.set('utm_content', content);
  return url.toString();
}

export function plainText(value: string, limit: number): string {
  const text = he.decode(sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .replace(/\s+/g, ' ').trim();
  return text.length > limit ? text.slice(0, limit - 1).trimEnd() + '…' : text;
}

export function parseArticles(value: unknown, projectId: string): Article[] {
  if (!Array.isArray(value)) throw new Error('Invalid WordPress response');
  return value.slice(0, 4).map((post) => {
    if (!post || !Number.isInteger(post.id) || typeof post.date_gmt !== 'string' ||
      typeof post.link !== 'string' || typeof post.title?.rendered !== 'string' ||
      typeof post.excerpt?.rendered !== 'string') throw new Error('Invalid WordPress article');
    const date = new Date(post.date_gmt + 'Z');
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid article date');
    return { id: post.id, date: date.toISOString(), title: plainText(post.title.rendered, 240),
      excerpt: plainText(post.excerpt.rendered, 180), url: trackedUrl(post.link, projectId, 'article') };
  });
}

// A service instance owns its cache. Concurrent admin requests share the same origin request.
export function createNewsService(projectId: string, options: {
  fetch?: typeof fetch; now?: () => number; timeoutMs?: number; warn?: () => void;
} = {}) {
  const source = projectSlug(projectId);
  const request = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  let cache: { articles: Article[]; savedAt: number } | undefined;
  let retryAt = 0;
  let pending: Promise<News> | undefined;
  let active: AbortController | undefined;
  const result = (unavailable = false): News => ({
    articles: cache && now() - cache.savedAt < STALE_MS ? cache.articles : [],
    stale: !!cache && now() - cache.savedAt >= FRESH_MS && now() - cache.savedAt < STALE_MS,
    unavailable,
    viewAllUrl: trackedUrl(BLOG_URL, source, 'view_all'),
  });
  async function refresh(): Promise<News> {
    const controller = new AbortController();
    active = controller;
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
    try {
      const url = new URL('wp-json/wp/v2/posts', BLOG_URL);
      url.search = new URLSearchParams({ per_page: '4', status: 'publish', orderby: 'date', order: 'desc',
        _fields: 'id,date_gmt,link,title,excerpt' }).toString();
      const response = await request(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Blog unavailable');
      const articles = parseArticles(await response.json(), source);
      cache = { articles, savedAt: now() };
      retryAt = 0;
      return result();
    } catch {
      retryAt = now() + RETRY_MS;
      options.warn?.();
      return result(!cache || now() - cache.savedAt >= STALE_MS);
    } finally {
      clearTimeout(timer);
      active = undefined;
    }
  }
  return {
    async get(): Promise<News> {
      if (cache && now() - cache.savedAt < FRESH_MS) return result();
      if (now() < retryAt) return result(!cache || now() - cache.savedAt >= STALE_MS);
      if (!pending) pending = refresh().finally(() => { pending = undefined; });
      return pending;
    },
    destroy() { active?.abort(); },
  };
}

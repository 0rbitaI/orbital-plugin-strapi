import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { createNewsService, projectSlug } from './news';

export default {
  config: {
    default: { projectId: '' },
    validator(config: { projectId: unknown }) { projectSlug(config.projectId); },
  },
  services: {
    news: ({ strapi }: { strapi: Core.Strapi }) => createNewsService(
      strapi.config.get('plugin::orbital-news.projectId') as string,
      { warn: () => strapi.log.warn('[orbital-news] Blog unavailable; using the cache when eligible.') },
    ),
  },
  controllers: {
    news: ({ strapi }: { strapi: Core.Strapi }) => ({
      async articles(ctx: Context) {
        ctx.set('Cache-Control', 'private, no-store');
        ctx.body = await strapi.plugin('orbital-news').service('news').get();
      },
    }),
  },
  // Admin routes use Strapi admin authentication, never Users & Permissions or public API access.
  routes: { admin: { type: 'admin', routes: [{ method: 'GET', path: '/articles',
    handler: 'news.articles', config: { policies: ['admin::isAuthenticatedAdmin'] } }] } },
  destroy({ strapi }: { strapi: Core.Strapi }) { strapi.plugin('orbital-news').service('news').destroy(); },
};

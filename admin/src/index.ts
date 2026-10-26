import type { StrapiApp } from '@strapi/admin/strapi-admin';
import { Earth } from '@strapi/icons';

export default {
  register(app: StrapiApp) {
    app.registerPlugin({ id: 'orbital-news', name: 'Orbital News' });
    // https://docs.strapi.io/cms/admin-panel-customization/homepage
    app.widgets.register({ id: 'latest-articles', pluginId: 'orbital-news', icon: Earth,
      title: { id: 'orbital-news.widget.title', defaultMessage: 'Orbital News' },
      component: async () => (await import('./components/NewsWidget')).default,
    });
  },
};

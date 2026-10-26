<a href="https://orbital.company/"><img src="assets/orbital.svg" alt="Orbital" width="221"></a>

# Orbital News

Strapi admin homepage widget displaying the four latest articles from the Orbital blog. Built with TypeScript and the native Strapi Design System.

## Requirements

- Strapi **5.13.0+**, below 6.0.0; validated with **5.59.0**.
- React 18 and the Strapi Design System 2.x.
- A Node.js version supported by your Strapi installation, and Yarn for development.

## Installation

Clone this repository, install dependencies and build the plugin:

```sh
git clone git@github.com:0rbitaI/orbital-plugin-strapi.git
cd orbital-plugin-strapi
yarn
yarn build
yarn pack --filename /tmp/orbital-strapi-plugin-news.tgz
```

In the destination Strapi project:

```sh
yarn add /tmp/orbital-strapi-plugin-news.tgz
```

Configure the plugin on the server, merging with your existing `config/plugins.js`:

```js
module.exports = ({ env }) => ({
  'orbital-news': {
    enabled: true,
    config: { projectId: env('ORBITAL_NEWS_PROJECT_ID') },
  },
});
```

Set a client project identifier in the Strapi server environment:

```dotenv
ORBITAL_NEWS_PROJECT_ID=my-client
```

Then run `yarn build` in the Strapi project and restart it. The widget is registered on the homepage through `app.widgets.register`. Users with a saved layout may need **Add Widget → Orbital News**.

The package is named `@orbital/strapi-plugin-news`; its Strapi ID is `orbital-news`. The repository is the distribution source; no npm registry publication is required.

### Local development inside a Strapi project

You can instead copy this repository to `src/plugins/orbital-news`, excluding `.git`, `node_modules` and generated files, and add `resolve: './src/plugins/orbital-news'` alongside `enabled` and `config`. Build the plugin before the host admin build or development startup:

```sh
yarn --cwd src/plugins/orbital-news build
yarn build
yarn develop
```

The plugin does not set the client's homepage order or modify other widgets. That configuration belongs to each Strapi project.

## Behavior

- Reads the public WordPress API at `https://blog.orbital.company/wp-json/wp/v2/posts` on the backend, requesting only `id`, `date_gmt`, `link`, `title` and `excerpt`, with four published articles ordered newest first.
- The browser accesses only `GET /orbital-news/articles`, an authenticated Strapi admin route. Users & Permissions tokens do not grant access, and no public content API endpoint is exposed.
- Caches valid results for **six hours**. During origin failures, the last successful response remains eligible until **seven days from its fetch**. Failed requests are retried no more than once every **ten minutes**, with a **four-second timeout**.
- Cache is in memory, per Strapi process. Restarts clear it; multiple workers maintain independent caches. Concurrent requests share a single origin request, and a successful empty response replaces previous articles.
- Blog failures remain local to the widget and do not block the admin panel or server startup. Native loading, empty and error states are provided. Cached fallback articles show a stale notice.
- Titles and short excerpts are plain text, with HTML removed and entities decoded. Dates are rendered in `pt-BR`, in the `America/Sao_Paulo` timezone.
- Links open in a new tab with `rel="noopener noreferrer"`. Origin and article URLs are restricted to the fixed blog origin; browser parameters cannot override the source, and redirects are rejected.
- Uses native Strapi typography, spacing, links and theme colors. The widget logo is temporarily hidden through the native `hidden` attribute, while its markup and bundled asset remain available. Montserrat and its license are retained in the package but the widget uses Strapi's native font.
- Requests are aborted on unmount; server timers are cleared and active origin requests are aborted on shutdown.

No WordPress credentials, tracking pixels or external browser requests are required. The blog receives the server's IP as part of the backend HTTP request. Customer and admin information is not sent in that request.

## Campaign attribution

All article and general blog links preserve existing query parameters and fragments, replacing these campaign values:

| Parameter | Value |
| --- | --- |
| `utm_source` | Server-configured client project identifier, normalized to a slug |
| `utm_medium` | `strapi_dashboard` |
| `utm_campaign` | `orbital_blog` |
| `utm_content` | `article` or `view_all` |

For example, `São Paulo / Client` becomes `sao-paulo-client`. Identifiers are limited to 80 ASCII characters and must contain letters or numbers. Configuration is server-only. In Strapi, this identifier replaces the active theme name used by the WordPress plugin. No GTM configuration is changed.

## Development

```sh
yarn
yarn test
yarn typecheck
yarn build
```

Tests cover cache boundaries, stale expiration, retry delay, failures, empty results, concurrent requests, timeout, cleanup, response validation, plain text and UTMs. Versioning tests exercise the actual Git hook in disposable repositories.

With a local Strapi server running, access tests verify rejection of anonymous, invalid bearer and content API tokens, plus absence of a public route:

```sh
ORBITAL_NEWS_TEST_URL=http://localhost:1337 \
STRAPI_ENV_FILE=/absolute/path/to/strapi/.env \
yarn test:access
```

The local `.env` is read only to sign a short-lived Users & Permissions token for a rejection test; it is never committed or printed. Manual validation should include authenticated access, loading/error/empty states, keyboard focus and mobile layouts.

## Automatic versioning

Run `yarn setup:hooks` after cloning; `yarn` also configures the hook through `prepare`. Hook setup is skipped when the package is installed inside another repository, so it cannot change the host application's hooks.

Use English, single-line Conventional Commit subjects. The versioned `.githooks/post-commit` runs `.claude/git-hook-version.js`, updates `package.json`, prepends a Keep a Changelog release section and amends the local commit. Dates use `America/Sao_Paulo`.

- `feat:` increments the minor version.
- Breaking commits (`!` or `BREAKING CHANGE:`) increment the major version.
- Other commit types increment the patch version.

Do not edit the version or changelog manually while the hook is active. Push remains a separate, explicit action. The hook performs no network operations and never pushes.

## Assets and licenses

Plugin code is MIT licensed; see [LICENSE](LICENSE). The README uses the same Orbital logo prepared for the WordPress plugin. The Orbital logo remains Orbital's trademark.

Montserrat is bundled under SIL Open Font License 1.1; see [OFL.txt](admin/src/assets/OFL.txt). Runtime logo assets are packaged locally, with no external asset hosting dependency.

## References

- [Strapi homepage widget API](https://docs.strapi.io/cms/admin-panel-customization/homepage)
- [Strapi plugin Server API](https://docs.strapi.io/cms/plugins-development/server-api)
- [WordPress posts API](https://developer.wordpress.org/rest-api/reference/posts/)

## Orbital

- [Website](https://orbital.company/)
- [Blog](https://blog.orbital.company/)
- [Careers](https://orbital.company/vagas)
- [WordPress plugin](https://github.com/0rbitaI/orbital-plugin-wordpress)

<a href="https://orbital.company/"><img src="https://orbital.company/images/logo.svg" alt="Orbital" height="60"></a>

# Orbital News

[![npm version](https://img.shields.io/npm/v/@0rb1tal/strapi-plugin-news.svg)](https://www.npmjs.com/package/@0rb1tal/strapi-plugin-news)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Strapi 5](https://img.shields.io/badge/Strapi-^5.60.0-4945ff.svg)](https://strapi.io)

Strapi admin homepage widget displaying the four latest articles from the Orbital blog. Built with TypeScript and the native Strapi Design System.

## Features

- **Native UI**: seamlessly blends into the Strapi 5 Admin homepage using Strapi Design System 2.x.
- **Secure by design**: strictly server-side fetched and HTML-sanitized (zero client-side external requests or XSS vectors).
- **Intelligent caching**: 6-hour in-memory cache with stale-while-revalidate and resilient offline fallback for up to 7 days.
- **Automated campaign attribution**: attaches normalized UTM tags per project.
- **Zero bloat**: lightweight footprint with no tracking pixels or client credentials required.

## Requirements

- Strapi **5.x**, validated with **5.60.0**.
- React 18 and the Strapi Design System 2.x.
- A Node.js version supported by your Strapi installation (Node >= 20.0.0).

## Installation

Install the package into your Strapi project:

```sh
yarn add @0rb1tal/strapi-plugin-news
# or
npm install @0rb1tal/strapi-plugin-news
```

## Configuration

### 1. Environment Variable

Define your project identifier in your Strapi server `.env`:

```dotenv
ORBITAL_NEWS_PROJECT_ID=my-client
```

> [!IMPORTANT]
> `ORBITAL_NEWS_PROJECT_ID` is required. The plugin validates this slug on startup and uses it for UTM tracking (`utm_source`). It must contain letters or numbers (up to 80 characters).

### 2. Enable the Plugin

Enable and configure the plugin in your Strapi project's `config/plugins.ts` (or `config/plugins.js`):

**TypeScript (`config/plugins.ts`):**

```ts
export default ({ env }) => ({
  "orbital-news": {
    enabled: true,
    config: {
      projectId: env("ORBITAL_NEWS_PROJECT_ID"),
    },
  },
});
```

**JavaScript (`config/plugins.js`):**

```js
module.exports = ({ env }) => ({
  "orbital-news": {
    enabled: true,
    config: {
      projectId: env("ORBITAL_NEWS_PROJECT_ID"),
    },
  },
});
```

### 3. Build & Restart

Rebuild your Strapi admin panel and start the server:

```sh
yarn build
yarn develop
```

The widget registers automatically on the Strapi Admin homepage. If you have previously customized your homepage layout, click **Add Widget** in the upper-right corner of the admin homepage and select **Orbital News**.

### Local development inside a Strapi project

To develop or test changes locally inside a host Strapi project:

```sh
git clone https://github.com/0rbitaI/orbital-plugin-strapi.git src/plugins/orbital-news
cd src/plugins/orbital-news
yarn
yarn build
```

Then configure `resolve` in `config/plugins.ts` (or `plugins.js`):

```ts
export default ({ env }) => ({
  "orbital-news": {
    enabled: true,
    resolve: "./src/plugins/orbital-news",
    config: {
      projectId: env("ORBITAL_NEWS_PROJECT_ID"),
    },
  },
});
```

Build the plugin before the host admin build or development startup:

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
- Uses native Strapi typography, spacing, links and theme colors from the Strapi Design System.
- Requests are aborted on unmount; server timers are cleared and active origin requests are aborted on shutdown.

No WordPress credentials, tracking pixels or external browser requests are required. The blog receives the server's IP as part of the backend HTTP request. Customer and admin information is not sent in that request.

## Campaign attribution

All article and general blog links preserve existing query parameters and fragments, replacing these campaign values:

| Parameter      | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| `utm_source`   | Server-configured client project identifier, normalized to a slug |
| `utm_medium`   | `strapi_dashboard`                                                |
| `utm_campaign` | `orbital_blog`                                                    |
| `utm_content`  | `article` or `view_all`                                           |

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

Plugin code is MIT licensed; see [LICENSE](LICENSE). The README uses the official absolute logo URL, matching the WordPress plugin. The Orbital logo remains Orbital's trademark.

Runtime logo assets are packaged locally, with no external asset hosting dependency.

## References

- [Strapi homepage widget API](https://docs.strapi.io/cms/admin-panel-customization/homepage)
- [Strapi plugin Server API](https://docs.strapi.io/cms/plugins-development/server-api)

## Orbital

- [Website](https://orbital.company/)
- [Blog](https://blog.orbital.company/)
- [Careers](https://orbital.company/vagas)

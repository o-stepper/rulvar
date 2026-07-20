import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformerTwoslash } from '@shikijs/vitepress-twoslash';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { nav } from './nav.js';
import { sidebar } from './sidebar.js';

const here = dirname(fileURLToPath(import.meta.url));

// The monorepo root package.json is a never-published 0.0.0 placeholder;
// the released fixed-group version lives on the umbrella package.
const umbrellaPkg = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'packages', 'rulvar', 'package.json'), 'utf8'),
) as {
  version: string;
};

const VERSION = umbrellaPkg.version;
const SITE_URL = 'https://docs.rulvar.com';
const REPO_URL = 'https://github.com/o-stepper/rulvar';
const HOME_URL = 'https://rulvar.com';

const SITE_TITLE = 'Rulvar';
const SITE_TITLE_TEMPLATE = ':title - Rulvar';
const SITE_DESCRIPTION =
  'An embeddable TypeScript engine for multi-agent LLM workflows - durable (a completed LLM call is never paid for twice), budget-bounded, vendor-neutral, observable, and testable. No server, no database, no control plane.';

/**
 * Mirrors VitePress's own `<title>` computation (`createTitle` in
 * `shared.ts`) so the per-page social-card title always matches the
 * browser-tab title. `scripts/docs-metadata.mjs` asserts the two stay
 * equal on every built page, which pins this port to upstream.
 */
function resolvePageTitle(pageData: {
  title?: string;
  titleTemplate?: string | boolean;
}): string {
  const title = pageData.title || SITE_TITLE;
  const template = pageData.titleTemplate ?? SITE_TITLE_TEMPLATE;
  if (typeof template === 'string' && template.includes(':title')) {
    return template.replace(/:title/u, title);
  }
  const suffix =
    template === false
      ? ''
      : template === true
        ? ` | ${SITE_TITLE}`
        : template === SITE_TITLE
          ? ''
          : ` | ${template}`;
  if (title === suffix.slice(3)) return title;
  return `${title}${suffix}`;
}

const baseConfig = defineConfig({
  lang: 'en-US',
  title: SITE_TITLE,
  titleTemplate: SITE_TITLE_TEMPLATE,
  description: SITE_DESCRIPTION,
  cleanUrls: true,
  lastUpdated: true,
  // The TypeDoc-generated tree links to per-package README anchors and
  // `_media/` artefacts that we deliberately omit (`readme: "none"` in
  // `typedoc.json`). Ignore dead links only inside `/api/**` plus the
  // relative forms TypeDoc emits; narrative pages still fail the build
  // on a real broken link.
  ignoreDeadLinks: [/^\/api\//, /_media\//, /\/README$/, /\/LICENSE$/, 'localhostLinks'],
  metaChunk: true,
  srcDir: '.',
  srcExclude: ['README.md', 'node_modules/**'],
  outDir: '.vitepress/dist',
  cacheDir: '.vitepress/cache',

  transformPageData(pageData) {
    if (pageData.isNotFound) return;

    const route = pageData.relativePath
      .replace(/(^|\/)index\.md$/u, '$1')
      .replace(/\.md$/u, '');
    const canonicalUrl = new URL(route, `${SITE_URL}/`).href;

    // Social cards carry the page's own title and description, not a
    // site-wide constant; the global `head` below contributes only the
    // page-independent tags (og:type, og:site_name, og:image, card).
    const pageTitle = resolvePageTitle(pageData);
    const pageDescription = pageData.description || SITE_DESCRIPTION;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { name: 'twitter:title', content: pageTitle }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
    );
  },

  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Oleksiy Stepurenko' }],
    // Both scheme variants, matching --vp-c-bg in theme/style.css, so
    // the browser chrome follows the reader's colour scheme.
    [
      'meta',
      { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f3f1eb' },
    ],
    [
      'meta',
      { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0b1018' },
    ],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    // og:title, og:description, twitter:title, and twitter:description
    // are per-page tags, pushed in transformPageData above; only the
    // page-independent Open Graph surface lives here.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Rulvar' }],
    ['meta', { property: 'og:image', content: `${HOME_URL}/public/og.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${HOME_URL}/public/og.png` }],
  ],

  sitemap: {
    hostname: SITE_URL,
  },

  markdown: {
    theme: { light: 'vitesse-light', dark: 'vitesse-dark' },
    lineNumbers: false,
    codeTransformers: [transformerTwoslash()],
    languages: ['ts', 'tsx', 'js', 'jsx', 'bash', 'json', 'yaml', 'md', 'mermaid'],
    image: { lazyLoading: true },
  },

  themeConfig: {
    siteTitle: 'Rulvar',
    logo: { light: '/logo.svg', dark: '/logo.dark.svg', alt: 'Rulvar' },

    nav,
    sidebar,

    socialLinks: [{ icon: 'github', link: REPO_URL, ariaLabel: 'GitHub repository' }],

    editLink: {
      pattern: `${REPO_URL}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
        translations: {
          button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset search',
            backButtonTitle: 'Close search',
            noResultsText: 'No results for',
            footer: {
              selectText: 'to select',
              navigateText: 'to navigate',
              closeText: 'to close',
            },
          },
        },
      },
    },

    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },

    footer: {
      message: `Released under the <a href="${REPO_URL}/blob/main/LICENSE">Apache-2.0 License</a>. Rulvar · v${VERSION} · created and maintained by <a href="mailto:step.oleksiy@gmail.com">Oleksiy Stepurenko</a>.`,
      copyright: `© 2026 Oleksiy Stepurenko · <a href="${HOME_URL}">rulvar.com</a> · <a href="${REPO_URL}">github.com/o-stepper/rulvar</a>`,
    },
  },
});

export default withMermaid({
  ...baseConfig,
  vite: {
    resolve: {
      alias: {
        'vitepress-plugin-mermaid/Mermaid.vue': resolve(here, 'theme/components/DocsMermaid.vue'),
      },
    },
    // Explicit chunk-size decision (v1.16 review P4): every chunk over
    // Vite's 500 kB default is loaded on demand, not on first paint -
    // the local search index (~3.3 MB, dynamically imported when search
    // is focused, and the only chunk that legitimately grows with
    // content), the mermaid/cytoscape diagram engines (per-diagram
    // imports), and route-scoped page data (the changelog). The theme
    // bundle sits well under 1 MB and VitePress offers no route-level
    // splitting for it, so manualChunks would only shuffle bytes
    // between requests. Growth control does NOT rest on this warning
    // limit (v1.16.1 review P4): scripts/docs-search-budget.mjs fails
    // the docs build when the search index regresses more than 10
    // percent over its committed size baseline.
    build: { chunkSizeWarningLimit: 3600 },
  },
  mermaid: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#111923',
      primaryTextColor: '#f8f8f5',
      primaryBorderColor: '#2e3844',
      lineColor: '#5b636e',
      secondaryColor: '#0e1520',
      tertiaryColor: '#0b1018',
      mainBkg: '#111923',
      nodeTextColor: '#f8f8f5',
      edgeLabelBackground: '#0b1018',
    },
  },
  mermaidPlugin: {
    class: 'mermaid rulvar-mermaid',
  },
});

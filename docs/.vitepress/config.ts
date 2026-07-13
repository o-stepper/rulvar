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

const baseConfig = defineConfig({
  lang: 'en-US',
  title: 'rulvar',
  titleTemplate: ':title - rulvar',
  description:
    'An embeddable TypeScript engine for multi-agent LLM workflows - durable (a completed LLM call is never paid for twice), budget-bounded, vendor-neutral, observable, and testable. No server, no database, no control plane.',
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

  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Oleksiy Stepurenko' }],
    ['meta', { name: 'theme-color', content: '#f3f1eb' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'rulvar' }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:title', content: 'rulvar documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows.',
      },
    ],
    ['meta', { property: 'og:image', content: `${HOME_URL}/public/og.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${HOME_URL}/public/og.png` }],
    ['meta', { name: 'twitter:title', content: 'rulvar documentation' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          'An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows. Apache-2.0. © 2026 Oleksiy Stepurenko.',
      },
    ],
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
    siteTitle: 'rulvar',
    logo: { light: '/logo.svg', dark: '/logo.dark.svg', alt: 'rulvar' },

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
      message: `Released under the <a href="${REPO_URL}/blob/main/LICENSE">Apache-2.0 License</a>. rulvar · v${VERSION} · created and maintained by <a href="mailto:step.oleksiy@gmail.com">Oleksiy Stepurenko</a>.`,
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

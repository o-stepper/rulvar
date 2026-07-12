import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
  { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
  { text: 'Reference', link: '/reference/packages', activeMatch: '/reference/' },
  { text: 'API', link: '/api/', activeMatch: '/api/' },
  { text: 'Contributing', link: '/contributing/', activeMatch: '/contributing/' },
  { text: 'Website', link: 'https://rulvar.com' },
];

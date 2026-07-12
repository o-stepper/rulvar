import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import '@shikijs/vitepress-twoslash/style.css';
import './style.css';
import FrameworkBadge from './components/FrameworkBadge.vue';

function removeOrphanedMermaidBodyNodes(): void {
  document.body
    .querySelectorAll(':scope > div[id^="dmermaid-"], :scope > div[id^="imermaid-"]')
    .forEach((node) => {
      node.remove();
    });
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.use(TwoslashFloatingVue);
    app.component('FrameworkBadge', FrameworkBadge);

    // Remove transient Mermaid render targets if the library aborted before cleanup (older plugin behaviour).
    if (typeof window !== 'undefined' && router) {
      const prevAfter = router.onAfterRouteChange;
      router.onAfterRouteChange = async (to) => {
        await prevAfter?.(to);
        removeOrphanedMermaidBodyNodes();
      };
      removeOrphanedMermaidBodyNodes();
    }
  },
};

export default theme;

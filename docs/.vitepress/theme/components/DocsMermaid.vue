<!-- Fork of vitepress-plugin-mermaid/dist/Mermaid.vue - uses a render host container (see mermaid-render-host.ts). -->
<template>
  <div v-html="svg" :class="props.class"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, toRaw } from 'vue';
import { render, init } from './mermaid-render-host';
import { useData } from 'vitepress';

const pluginSettings = ref({
  securityLevel: 'loose',
  startOnLoad: false,
  externalDiagrams: [],
});
const { page } = useData();
const { frontmatter } = toRaw(page.value);
const mermaidPageTheme = frontmatter.mermaidTheme || '';

const props = defineProps({
  graph: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    required: false,
    default: 'mermaid',
  },
});

const svg = ref(null);
let mut = null;

onMounted(async () => {
  await init(pluginSettings.value.externalDiagrams);
  let settings = await import('virtual:mermaid-config');
  if (settings?.default) pluginSettings.value = settings.default;

  mut = new MutationObserver(async () => await renderChart());
  mut.observe(document.documentElement, { attributes: true });
  await renderChart();

  const hasImages = /<img([\w\W]+?)>/.exec(decodeURIComponent(props.graph))?.length > 0;
  if (hasImages)
    setTimeout(() => {
      let imgElements = document.getElementsByTagName('img');
      let imgs = Array.from(imgElements);
      if (imgs.length) {
        Promise.all(
          imgs
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resolve) => {
                  img.onload = img.onerror = resolve;
                }),
            ),
        ).then(async () => {
          await renderChart();
        });
      }
    }, 100);
});

onUnmounted(() => mut.disconnect());

const renderChart = async () => {
  const hasDarkClass = document.documentElement.classList.contains('dark');
  let mermaidConfig = {
    ...pluginSettings.value,
  };

  if (mermaidPageTheme) mermaidConfig.theme = mermaidPageTheme;
  if (hasDarkClass) mermaidConfig.theme = 'dark';

  let svgCode = await render(props.id, decodeURIComponent(props.graph), mermaidConfig);
  const salt = Math.random().toString(36).substring(7);
  svg.value = `${svgCode} <span style="display: none">${salt}</span>`;
};
</script>

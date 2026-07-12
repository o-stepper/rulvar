<script setup lang="ts">
// Default the badge version to the umbrella package.json version (the
// released fixed-group version; the monorepo root is a never-published
// 0.0.0 placeholder) so it never drifts out of sync on a bump. The
// site footer in config.ts reads the same source.
import { version as pkgVersion } from '../../../../packages/rulvar/package.json';

withDefaults(
  defineProps<{
    version?: string;
    license?: string;
  }>(),
  {
    version: pkgVersion,
    license: 'Apache-2.0',
  },
);
</script>

<template>
  <span class="framework-badge" role="status">
    <span class="dot" aria-hidden="true" />
    <span>v{{ version }}</span>
    <span aria-hidden="true">·</span>
    <span>{{ license }}</span>
  </span>
</template>

/**
 * lurker umbrella (published as @lurker/lurker while the unscoped name is
 * contingent; docs/13, section "Naming risk note"): the single-install
 * path. Re-exports @lurker/core and the terminal progress renderer; both
 * first-class adapters join with M1-T15, the file store with M2.
 */
export * from '@lurker/core';
export { renderProgress, type RenderProgressOptions } from './render-progress.js';

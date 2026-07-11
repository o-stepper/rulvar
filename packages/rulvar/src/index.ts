/**
 * rulvar umbrella (published as @rulvar/rulvar while the unscoped name is
 * contingent; docs/13, section "Naming risk note"): the single-install
 * path re-exporting @rulvar/core, both first-class adapters, and the
 * terminal progress renderer; the file store joins with M2 (docs/02,
 * section "Package map").
 */
export * from '@rulvar/core';
export { anthropic, ANTHROPIC_MODELS } from '@rulvar/anthropic';
export type { AnthropicAdapterOptions } from '@rulvar/anthropic';
export { openai, OPENAI_MODELS } from '@rulvar/openai';
export type { OpenAiAdapterOptions } from '@rulvar/openai';
export { renderProgress, type RenderProgressOptions } from './render-progress.js';
export { recommendedDefaults } from './defaults.js';

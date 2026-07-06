/**
 * lurker umbrella (published as @lurker/lurker while the unscoped name is
 * contingent; docs/13, section "Naming risk note"): the single-install
 * path re-exporting @lurker/core, both first-class adapters, and the
 * terminal progress renderer; the file store joins with M2 (docs/02,
 * section "Package map").
 */
export * from '@lurker/core';
export { anthropic, ANTHROPIC_MODELS } from '@lurker/anthropic';
export type { AnthropicAdapterOptions } from '@lurker/anthropic';
export { openai, OPENAI_MODELS } from '@lurker/openai';
export type { OpenAiAdapterOptions } from '@lurker/openai';
export { renderProgress, type RenderProgressOptions } from './render-progress.js';
export { recommendedDefaults } from './defaults.js';

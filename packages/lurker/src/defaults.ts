/**
 * Umbrella-only strong default model configuration (M1-T15): named strong
 * defaults for the orchestrate and plan roles live ONLY here, never in
 * @lurker/core; the core ships the floor mechanism, the umbrella ships
 * opinions (docs/04, section "Role quality floors"). Weak model defaults
 * are forbidden for plan and orchestrate work.
 */
import type { InvocationRole, ModelSpec } from '@lurker/core';

/**
 * Drop-in engine defaults: `createEngine({ ..., defaults: { routing:
 * recommendedDefaults.routing } })`. Hosts override freely; these are
 * data, not engine semantics.
 */
export const recommendedDefaults: {
  routing: Partial<Record<InvocationRole, ModelSpec>>;
} = {
  routing: {
    orchestrate: { model: 'anthropic:claude-fable-5', effort: 'high' },
    plan: { model: 'anthropic:claude-fable-5', effort: 'high' },
    summarize: { model: 'anthropic:claude-sonnet-5', effort: 'low' },
    extract: { model: 'openai:gpt-5.4-mini', effort: 'low' },
  },
};

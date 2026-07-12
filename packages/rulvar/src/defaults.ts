/**
 * Umbrella-only strong default model configuration (M1-T15): named strong
 * defaults for the orchestrate and plan roles live ONLY here, never in
 * @rulvar/core; the core ships the floor mechanism, the umbrella ships
 * opinions. Weak model defaults
 * are forbidden for plan and orchestrate work.
 */
import type { InvocationRole, ModelSpec, QualityFloors } from '@rulvar/core';

/**
 * Drop-in engine defaults: `createEngine({ ..., defaults: { routing:
 * recommendedDefaults.routing, roleFloors: recommendedDefaults.floors } })`.
 * Hosts override freely; these are data, not engine semantics. The
 * floors pin orchestrate and plan to strong models as hard router
 * constraints (M4-T09): weak
 * model defaults are forbidden for plan and orchestrate work, and no
 * advice may override or weaken a floor.
 */
export const recommendedDefaults: {
  routing: Partial<Record<InvocationRole, ModelSpec>>;
  floors: QualityFloors;
} = {
  routing: {
    orchestrate: { model: 'anthropic:claude-fable-5', effort: 'high' },
    plan: { model: 'anthropic:claude-fable-5', effort: 'high' },
    summarize: { model: 'anthropic:claude-sonnet-5', effort: 'low' },
    extract: { model: 'openai:gpt-5.4-mini', effort: 'low' },
  },
  floors: {
    byRole: {
      orchestrate: {
        allow: [
          'anthropic:claude-fable-5',
          'anthropic:claude-opus-4-8',
          'anthropic:claude-opus-4-7',
          'openai:gpt-5.5',
        ],
      },
      plan: {
        allow: [
          'anthropic:claude-fable-5',
          'anthropic:claude-opus-4-8',
          'anthropic:claude-opus-4-7',
          'openai:gpt-5.5',
        ],
      },
    },
  },
};

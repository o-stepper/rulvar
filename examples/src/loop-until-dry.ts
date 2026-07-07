/**
 * Loop-until-dry (recipe; docs/00, section "Orchestration modes"). For
 * unknown-size discovery (bugs, edge cases, missing items), keep
 * spawning finders until K consecutive rounds surface nothing new. A
 * simple `while (count < N)` misses the tail; the dry-streak counter is
 * the point. Prompt-shaped composition over ctx.agent; the library
 * ships no "loop" mode.
 */
import { z } from 'zod';

import { defineWorkflow, type Ctx, type Workflow } from '@lurker/core';

const findingsSchema = z.strictObject({
  items: z.array(z.string()),
});

export interface LoopArgs {
  target: string;
  /** Stop after this many consecutive empty rounds (default 2). */
  dryRounds?: number;
  /** Hard cap on rounds so a pathological model still terminates. */
  maxRounds?: number;
}

export interface LoopResult {
  target: string;
  found: string[];
  rounds: number;
}

/**
 * Accumulates distinct findings across rounds; each round tells the
 * finder what is already known so it looks for something NEW. Stops
 * after `dryRounds` consecutive rounds with no fresh item, or at
 * `maxRounds`. Dedup is plain code, not an agent.
 */
export const loopUntilDry: Workflow<LoopArgs, LoopResult> = defineWorkflow(
  { name: 'loop-until-dry' },
  async (ctx: Ctx, args: LoopArgs) => {
    const dryLimit = args.dryRounds ?? 2;
    const maxRounds = args.maxRounds ?? 8;
    const seen = new Set<string>();
    let dryStreak = 0;
    let rounds = 0;
    while (dryStreak < dryLimit && rounds < maxRounds) {
      rounds += 1;
      const known = [...seen];
      const result = await ctx.agent(
        `Find items for "${args.target}" that are NOT already in this list: ` +
          `${JSON.stringify(known)}. Return an empty list when nothing new remains.`,
        { schema: findingsSchema, label: `finder-round-${rounds}` },
      );
      const fresh = result.items.filter((item) => !seen.has(item));
      if (fresh.length === 0) {
        dryStreak += 1;
        continue;
      }
      dryStreak = 0;
      for (const item of fresh) {
        seen.add(item);
      }
    }
    return { target: args.target, found: [...seen], rounds };
  },
);

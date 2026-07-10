/**
 * The model knowledge card (M10-T03; docs/05, section "Read path"). A
 * deterministic pure render in the profileCard tradition: two layers,
 * tier-relative, and the orchestrator NEVER sees model names (the
 * round-2 invariant). The verified layer compiles EXCLUSIVELY from
 * eval-measured claims into start-tier recommendations with the
 * one-rung clamp; human-editorial claims render as dated notes
 * explicitly marked unverified and are never compiled into a tier.
 */
import type { Effort, LadderSpec, ModelRef } from '../l0/messages.js';
import type { ModelClaim, TaskClass } from '../l0/spi/knowledge.js';
import type { AgentProfile } from '../engine/ctx.js';
import type { QualityFloors } from '../model/floors.js';
import { checkFloors } from '../model/floors.js';
import { claimExpired } from './claims.js';

/** docs/06, Appendix A: the KB card render budget (characters). */
export const KB_CARD_RENDER_BUDGET_CHARS = 4096;

/** One declared ladder of the run, named by its agentType. */
export interface DeclaredLadder {
  name: string;
  startTier: number;
  rungs: Array<{ model: ModelRef; effort?: Effort }>;
}

/**
 * The ladders a run declares: every advertised profile whose model
 * spec is a ladder (docs/04, section 12). The card is tier-relative to
 * exactly these.
 */
export function collectDeclaredLadders(
  profiles: Record<string, AgentProfile> | undefined,
): DeclaredLadder[] {
  const ladders: DeclaredLadder[] = [];
  for (const [name, profile] of Object.entries(profiles ?? {})) {
    const spec = profile.model;
    if (spec !== undefined && typeof spec !== 'string' && 'ladder' in spec) {
      const ladder: LadderSpec = spec.ladder;
      ladders.push({
        name,
        startTier: ladder.startTier,
        rungs: ladder.rungs.map((rung) => ({
          model: rung.model,
          ...(rung.effort === undefined ? {} : { effort: rung.effort }),
        })),
      });
    }
  }
  return ladders.sort((left, right) => (left.name < right.name ? -1 : 1));
}

function floored(
  model: ModelRef,
  taskClass: TaskClass,
  floors: QualityFloors | undefined,
): boolean {
  try {
    // Children of an orchestrate-role run resolve as loop-role spawns;
    // floors stay HARD constraints and the card only advises inside
    // them (docs/05, section "Composition with the model layer").
    checkFloors({ ref: model, role: 'loop', taskClass, floors });
    return false;
  } catch {
    return true;
  }
}

/**
 * The admission filter (docs/05, 4.1): status active, unexpired at
 * `now`, and the subject reachable through the run's declared ladders
 * after the role-floor filter.
 */
export function filterClaimsForRun(
  claims: readonly ModelClaim[],
  options: { ladders: readonly DeclaredLadder[]; floors?: QualityFloors; now: string },
): ModelClaim[] {
  const { ladders, floors, now } = options;
  return claims.filter((claim) => {
    if (claim.status !== 'active' || claimExpired(claim, now)) {
      return false;
    }
    return ladders.some((ladder) =>
      ladder.rungs.some(
        (rung) =>
          rung.model === claim.subject.model && !floored(rung.model, claim.taskClass, floors),
      ),
    );
  });
}

/** Every (ladder, tier) coordinate of one subject, model names withheld. */
function tiersOf(claim: ModelClaim, ladders: readonly DeclaredLadder[]): string[] {
  const coordinates: string[] = [];
  for (const ladder of ladders) {
    for (let index = 0; index < ladder.rungs.length; index += 1) {
      if (ladder.rungs[index]?.model === claim.subject.model) {
        coordinates.push(`${ladder.name} tier ${String(index)}`);
      }
    }
  }
  return coordinates;
}

interface VerifiedRow {
  ladder: string;
  taskClass: TaskClass;
  defaultTier: number;
  recommendedTier: number;
  votes: number;
}

/**
 * The verified layer: eval-measured claims vote a one-rung shift of
 * the start tier per (ladder, taskClass). A strength on a rung below
 * the default votes down (start cheaper); a weakness on the default
 * rung or below votes up. The net sign shifts EXACTLY one rung (the
 * clamp), bounded to the ladder; ties hold the default.
 */
function verifiedRows(
  claims: readonly ModelClaim[],
  ladders: readonly DeclaredLadder[],
): VerifiedRow[] {
  const rows: VerifiedRow[] = [];
  for (const ladder of ladders) {
    const byTaskClass = new Map<TaskClass, number>();
    const votesByTaskClass = new Map<TaskClass, number>();
    for (const claim of claims) {
      if (claim.class !== 'eval-measured') {
        continue;
      }
      const rungIndex = ladder.rungs.findIndex((rung) => rung.model === claim.subject.model);
      if (rungIndex === -1) {
        continue;
      }
      let vote = 0;
      if (claim.polarity === 'strength' && rungIndex < ladder.startTier) {
        vote = -1;
      } else if (claim.polarity === 'weakness' && rungIndex <= ladder.startTier) {
        vote = 1;
      }
      if (vote !== 0) {
        byTaskClass.set(claim.taskClass, (byTaskClass.get(claim.taskClass) ?? 0) + vote);
        votesByTaskClass.set(claim.taskClass, (votesByTaskClass.get(claim.taskClass) ?? 0) + 1);
      }
    }
    for (const [taskClass, net] of [...byTaskClass.entries()].sort()) {
      if (net === 0) {
        continue;
      }
      const shift = net > 0 ? 1 : -1;
      const recommended = Math.min(ladder.rungs.length - 1, Math.max(0, ladder.startTier + shift));
      if (recommended === ladder.startTier) {
        continue;
      }
      rows.push({
        ladder: ladder.name,
        taskClass,
        defaultTier: ladder.startTier,
        recommendedTier: recommended,
        votes: votesByTaskClass.get(taskClass) ?? 0,
      });
    }
  }
  return rows;
}

/**
 * The deterministic card render (docs/05, 4.3). Pure: same filtered
 * claims and ladders give byte-identical text. The render budget is
 * docs/06 Appendix A (4096 chars); over it, the OLDEST-observed notes
 * withhold first behind an explicit marker.
 */
export function modelKnowledgeCard(
  claims: readonly ModelClaim[],
  ladders: readonly DeclaredLadder[],
  options?: { budgetChars?: number },
): string {
  const budget = options?.budgetChars ?? KB_CARD_RENDER_BUDGET_CHARS;
  const lines: string[] = [
    'Model knowledge card (tier-relative; advisory within declared ladders and hard floors).',
  ];
  const verified = verifiedRows(claims, ladders);
  if (verified.length === 0) {
    lines.push('Verified layer: empty (no eval-measured claims).');
  } else {
    lines.push('Verified layer (start-tier recommendations, clamped one rung from the default):');
    for (const row of verified) {
      lines.push(
        `- ladder '${row.ladder}', taskClass '${row.taskClass}': start tier ` +
          `${String(row.recommendedTier)} (default ${String(row.defaultTier)}, eval evidence, ` +
          `${String(row.votes)} claim${row.votes === 1 ? '' : 's'})`,
      );
    }
  }
  const notes = claims
    .filter((claim) => claim.class === 'human-editorial')
    .sort((left, right) =>
      // Newest first, id as the deterministic tiebreak.
      left.observedAt === right.observedAt
        ? left.id < right.id
          ? -1
          : 1
        : left.observedAt < right.observedAt
          ? 1
          : -1,
    );
  const noteLines = notes.map((claim) => {
    const where = tiersOf(claim, ladders).join(', ');
    return (
      `- [${where}] ${claim.taskClass} ${claim.polarity} (confidence ${claim.confidence}, ` +
      `observed ${claim.observedAt}, expires ${claim.expiresAt}): ${claim.statement}`
    );
  });
  if (noteLines.length > 0) {
    lines.push('Editorial notes (editorial note, no metrics, not confirmed by evals):');
  }
  const render = (shown: number): string => {
    const withheld = noteLines.length - shown;
    const body = [...lines, ...noteLines.slice(0, shown)];
    if (withheld > 0) {
      body.push(
        `(${String(withheld)} older note${withheld === 1 ? '' : 's'} withheld by the render budget)`,
      );
    }
    return body.join('\n');
  };
  let shown = noteLines.length;
  let text = render(shown);
  while (shown > 0 && text.length > budget) {
    shown -= 1;
    text = render(shown);
  }
  return text;
}

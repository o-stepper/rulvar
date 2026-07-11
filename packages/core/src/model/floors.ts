/**
 * Role quality floors (M4-T09): per-role (and optionally per-declared-
 * taskClass) explicit model allowlists and denylists supplied in engine
 * config. Floors are HARD router constraints: no advice, including
 * ModelKnowledge later, may override or weaken them. No implicit
 * cross-adapter quality ordering exists or is ever computed; the
 * constraint is always an explicit list. A floor violation at
 * resolution is a typed ConfigError BEFORE any live call.
 *
 * Named strong default models live ONLY in the umbrella `rulvar`
 * package config, never here: the core ships the floor mechanism, the
 * umbrella ships opinions (docs/04, section "Role quality floors").
 */
import { ConfigError } from '../l0/errors.js';
import type { InvocationRole, ModelRef } from '../l0/messages.js';
import type { TaskClass } from '../l0/spi/knowledge.js';

/** An explicit allowlist and denylist; deny wins over allow. */
export type ModelListConstraint = { allow?: ModelRef[]; deny?: ModelRef[] };

/**
 * Bridges the ModelKnowledge vocabulary; the canonical union lives with
 * the knowledge SPI (docs/05); default unclassified.
 */
export type { TaskClass };

export interface QualityFloors {
  byRole?: Partial<Record<InvocationRole, ModelListConstraint>>;
  byTaskClass?: Partial<Record<TaskClass, ModelListConstraint>>;
}

function violates(ref: ModelRef, constraint: ModelListConstraint | undefined): string | undefined {
  if (constraint === undefined) {
    return undefined;
  }
  if (constraint.deny?.includes(ref) === true) {
    return 'the denylist names it';
  }
  if (constraint.allow !== undefined && !constraint.allow.includes(ref)) {
    return 'the allowlist does not include it';
  }
  return undefined;
}

/**
 * Enforces the floors for one resolved invocation. `taskClass` is the
 * profile-declared class; when absent (unclassified) only byRole floors
 * apply. Throws a typed ConfigError on violation.
 */
export function checkFloors(options: {
  ref: ModelRef;
  role: InvocationRole;
  floors?: QualityFloors;
  taskClass?: TaskClass;
}): void {
  const { ref, role, floors, taskClass } = options;
  if (floors === undefined) {
    return;
  }
  const roleViolation = violates(ref, floors.byRole?.[role]);
  if (roleViolation !== undefined) {
    throw new ConfigError(
      `quality floor violation: '${ref}' is floored out for role '${role}' ` +
        `(${roleViolation}); floors are hard router constraints (docs/04, section 9)`,
    );
  }
  if (taskClass !== undefined) {
    const classViolation = violates(ref, floors.byTaskClass?.[taskClass]);
    if (classViolation !== undefined) {
      throw new ConfigError(
        `quality floor violation: '${ref}' is floored out for taskClass '${taskClass}' ` +
          `(${classViolation}); floors are hard router constraints (docs/04, section 9)`,
      );
    }
  }
}

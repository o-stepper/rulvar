/**
 * Permission presets (M5-T05; docs/08, sections 4.2-4.3): presets
 * compile INTO the existing chain layers (deny rules and ask rules),
 * never a fifth layer, and never emit allow-overrides: an "allow" cell
 * simply emits no rule, so the call falls through to canUseTool and the
 * terminal default (a needsApproval: true tool still asks under every
 * preset). Compiled rules concatenate after host-authored rules in the
 * same layer; since rules only deny or ask, ordering within a layer
 * cannot change the verdict.
 *
 * The verdict-by-risk tables are normative ("allow" = no rule):
 *
 *   risk         strict   standard   open
 *   read         allow    allow      allow
 *   write        ask      allow      allow
 *   network      ask      ask        allow
 *   execute      ask      ask        allow
 *   destructive  deny     ask        allow
 *   (undeclared) ask      ask        allow
 *
 * `open` compiles to empty tables: it is exactly "chain without preset".
 * Undeclared risk is a first-class state presets treat conservatively;
 * the compiled `{ risk: 'undeclared' }` rule matches every tool without
 * declared risk (MCP-imported tools carry none unless the host supplies
 * a risk map).
 */
import type { PermissionRule } from '../runtime/permission-chain.js';

export type PermissionPreset = 'strict' | 'standard' | 'open';

export function compilePermissionPreset(preset: PermissionPreset): {
  deny: PermissionRule[];
  ask: PermissionRule[];
} {
  switch (preset) {
    case 'strict':
      return {
        deny: [{ risk: 'destructive' }],
        ask: [{ risk: ['write', 'network', 'execute'] }, { risk: 'undeclared' }],
      };
    case 'standard':
      return {
        deny: [],
        ask: [{ risk: ['network', 'execute', 'destructive'] }, { risk: 'undeclared' }],
      };
    case 'open':
      return { deny: [], ask: [] };
  }
}

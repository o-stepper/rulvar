---
'@lurker/core': minor
---

M5-T05 permission presets, audit, dry-run and M5-T06 argv shell matcher.

- `compilePermissionPreset('strict' | 'standard' | 'open')`
  (`tools/presets.ts`) compiles the shipped presets to the documented
  verdict-by-risk tables and folds INTO the existing deny/ask chain
  layers, after host-authored rules, never a fifth layer and never an
  allow-override (a needsApproval tool still asks under every preset).
  `open` compiles to empty tables. `AgentProfilePermissions.preset` now
  compiles instead of throwing; undeclared tool risk is matched
  conservatively via a first-class `{ risk: 'undeclared' }` rule.
- The argv shell matcher (`tools/shell-matcher.ts`) replaces the M5
  fail-early stub for `{ tool, argv }` rules: a POSIX-like lexer honors
  quotes and escapes with no expansion, splits on `;`/`&&`/`||`/`|`/`&`/
  newline, poisons segments containing command or process substitution
  or here-docs to ask, strips leading env assignments, and retains
  redirections as tokens. Verdicts compose strictest-across-segments, so
  `npm test; rm -rf /` yields deny (or ask) even with `npm test`
  allow-listed, and any unmatched segment yields ask.
- `evaluatePermission` gains an offline overload (by tool name, no
  execution) for the docs/08 4.5 dry-run/shell-tooling API, and every
  verdict carries the audit payload (verdict, deciding layer, matched
  rule) that now rides `tool:end` events; advisory network-domain rules
  are reported there but never enforced outside first-party fetch
  (honest posture, docs/08 4.4).

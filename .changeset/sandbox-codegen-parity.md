---
'@rulvar/planner': minor
'eslint-plugin-rulvar': minor
---

Close the dynamic code generation parity gap in the planner sandbox dialect (v1.38.0 review P2-CODEGEN-PARITY).

`compileScript` and the `rulvar/no-code-generation` ESLint rule now share one AST policy (`scanDialect`), so both reach the same decision for every statically visible constructor reconstruction form: `.constructor`, `["constructor"]`, a computed key that folds to the constant, `{ constructor: x }` destructuring, and `Reflect.get(fn, "constructor")`. The previous regex compile gate matched only the dotted form, so a bracket or computed key passed compile while the linter flagged some of them; moving to an AST also drops the regex false positives, where a property merely named `eval`, `Function`, or `constructor` was wrongly rejected.

A key assembled only at runtime (`fn[parts.join("")]`) cannot be decided statically without rejecting every dynamic property access, so the worker realm now neutralizes the constructor reconstruction path at runtime by replacing the `constructor` slot on all four Function family prototypes with a thrower. A script that compiles clean can no longer reach the Function constructor through a dynamic key.

The planner and orchestration docs are corrected to state the exact boundary: the dialect rejects the statically visible forms and the worker neutralizes the runtime path, but a worker in the same process shares its intrinsics with the code it runs and remains a determinism and blast radius boundary, not a hostile code wall.

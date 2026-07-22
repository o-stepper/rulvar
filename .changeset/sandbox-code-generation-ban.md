---
'@rulvar/planner': minor
'eslint-plugin-rulvar': minor
---

Reject dynamic code generation in the planner sandbox dialect (v1.37.0 review SEC-P2). `compileScript` banned `import` but not `eval`, the `Function` constructor, or `.constructor` access, so a machine script could reach the Function constructor and compile a dynamic import the literal scan never saw, recovering the import allowlist and, through `node:child_process`, arbitrary host capability at run status `ok`. `compileScript` now rejects `eval`, `Function`, and `.constructor` (diagnostic ids `no-eval`, `no-function-constructor`, `no-constructor-access`); a new `rulvar/no-code-generation` ESLint rule carries the same ban into the `workflows` preset and the self repair loop; and the worker additionally unbinds `eval` and `Function` as defense in depth. This keeps the import allowlist meaningful and the dialect consistent. It is not a hostile code boundary, which the sandbox has never claimed to be: JavaScript intrinsics can still reconstruct the constructors, so the docs continue to call the sandbox a determinism and blast radius boundary, not a security one.

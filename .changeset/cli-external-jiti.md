---
'@rulvar/cli': patch
---

Mark eslint's optional TypeScript-config loader `jiti` as external in the CLI bundle. The bundled eslint (pulled in through @rulvar/planner's programmatic `Linter`) lazily imports `jiti` only on its config-file loading path, which the CLI never executes; the import now stays an import instead of producing UNRESOLVED_IMPORT build warnings. No runtime behavior change.

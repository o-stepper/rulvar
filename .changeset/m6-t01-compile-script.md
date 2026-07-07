---
'@lurker/planner': minor
---

M6-T01: compileScript and the CompiledWorkflow surface. `compileScript(source, { allowImports })` validates planner-generated source (syntax over the exact sandbox global set; import/require/export scanning with a literal-specifier allowlist defaulting to none) and compiles it into the core `CompiledWorkflow` data form (errorPolicy 'lenient'); any violation throws the typed `ScriptRejected` carrying machine-readable `ScriptDiagnostic[]` for the plan() self-repair loop. Exports `SANDBOX_GLOBALS` (the docs/06 8.2 curated list) and `scriptDiagnosticsOf`. The closure Workflow and CompiledWorkflow forms stay mutually unassignable by type.

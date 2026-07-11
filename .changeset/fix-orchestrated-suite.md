---
'@rulvar/evals': patch
---

The checkpoint's orchestrated arms take their own suite options (`orchestratedSuite`, defaulting to `suite`): the third live run showed the shared per-case budget starving the orchestrator cap math (a $0.10 run ceiling cannot host the default finalize reserve, so every orchestrate-role run died at OrchestratorCapConfigError before the first model call, at zero cost).

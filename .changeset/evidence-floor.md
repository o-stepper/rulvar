---
'@rulvar/core': minor
---

The evidence floor, the exact-fill parity proof, and the direct container e12 (PR III of the seventh-comparison-experiment plan: RV303, RV307, RV308, and the recommended tool budget posture).

RV303, the declared evidence contract: `AgentProfile.evidenceContract` and `PreflightSpawnSpec.evidenceContract` (`{ minEntries, estCallsPerEntry?, overheadCalls? }`, the spawn declaration winning over the profile's, `researchAgentProfile` passing it through) declare how many evidence entries a spawn MUST record. Preflight compares the resulting call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8, exported as `DEFAULT_EVIDENCE_CALLS_PER_ENTRY` and `DEFAULT_EVIDENCE_OVERHEAD_CALLS`) against the spawn's effective executed-call ceiling (weighted units and extension grants included) and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. Purely declarative, validated typed at both intake boundaries; the runtime never enforces it. The experiment relation nobody computed: 14 mandatory entries against a cap two workers exhausted at 10.

RV307, the exact-fill parity proof (the judge's P1.8): a scenario suite pinning that the strict-at-fill admission projection and the live layer-2 gate deny THE SAME child for THE SAME reason on one set of numbers, at the exact-fill boundary specifically, while the below-fill retry admits in both layers, riding the existing slot-ledger guarantees (a rejection burns no `maxSpawns` slot; resume recounts journaled admits only).

RV308, the direct container e12 (the judge's P1.9): the container executor now carries a DIRECT conformance test for the protocol-failure-at-clean-exit-0 case (typed `protocol` error, ledger outcome `error` with `exitCode: 0`), both against the daemonless docker stub (runs everywhere) and against the real daemon (docker-gated), instead of relying on source symmetry with the subprocess executor.

Docs: the new "The recommended tool budget posture" section in the agents guide (default no cap: the USD ceiling plus exploration guards bound spend; a cap is a safety valve, never bare, always with notices, an extension, a reserve or window, and a deliberate salvage decision; the full findings table), cross-linked from the budgets guide findings enumeration.

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateAcceptance

# Interface: OrchestrateAcceptance

Defined in: `packages/core/dist/index.d.ts`

The opt-in child completion policy (the v1.40.0 improvement plan's
completion contract): run status 'ok' alone never proves the children
succeeded, because the model may call finish after any mix of child
outcomes. When acceptance is set, the policy is evaluated exactly when
the model's finish validates, the verdict is journaled as ONE decision
entry (so a resume rolls the SAME verdict forward, immune to drift of
the live options), and the workflow result becomes the acceptance
envelope { result, completion, childStatusCounts, degradedReasons }. A
violated policy fails the run with the typed FailRunError (code
'fail_run', data.source 'orchestrator_acceptance') instead of settling
ok. A budget cap settle keeps its atCap policy and acceptance is not
judged at the cap: under 'finish-with-partial' the capped terminal
carries completion 'partial' in its envelope (RV906) precisely
because the declared acceptance went unjudged, and under 'fail-run'
the typed failure stands, so the cap can never impersonate an
accepted finish.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptpartialchildren"></a> `acceptPartialChildren?` | `boolean` | The partial-child salvage switch (RV-210 close-out; default false). When true, a child that settled 'limit' WITH a structured terminal partial (it recorded progress through the stock `report_progress` tool before the budget expired) counts as a successful child for the policy: under 'all-ok' it no longer rejects the run, and under { minSuccessful: N } it counts toward N. The acceptance verdict then reports completion 'partial' (never 'complete'), lists the salvaged children in `salvagedPartialChildren` on the result envelope, and keeps a per-child note in degradedReasons. A limit child WITHOUT a partial gave the caller nothing to salvage and still counts against the policy. The whole fold is journaled in the single acceptance decision, so a resume rolls the same verdict forward. | `packages/core/dist/index.d.ts` |
| <a id="property-acceptvalidatedterminaloutputonlimit"></a> `acceptValidatedTerminalOutputOnLimit?` | `boolean` | The terminal-output salvage switch (the 1.64.0 experiment review, P0.4 + P1.1; default false). When true, a child that settled 'limit' CARRYING a terminal output counts as a successful child for the policy, exactly like acceptPartialChildren counts a partial-bearing one. A limit terminal carries an output ONLY when the child's limits.finalizationReserve summary turn produced one AND, for a schema child, that summary already validated against the declared output schema (an invalid summary keeps output null and is never salvaged), so validation runs BEFORE acceptance by construction. The verdict then reports completion 'partial' (never 'complete'), lists the children in `salvagedTerminalOutputChildren` on the result envelope, and keeps a per-child note in degradedReasons. A child carrying BOTH an output and a progress partial salvages by its output. The child's digest and get_child_result surface the output unconditionally (paid, journaled evidence is never withheld); this option gates only the acceptance fold, the evidencePreservedValidator cited pool (via FinishValidationChild.salvageableOutput), and the coordination prompt line. The whole fold is journaled in the single acceptance decision, so a resume rolls the same verdict forward. | `packages/core/dist/index.d.ts` |
| <a id="property-childpolicy"></a> `childPolicy` | \| `"all-ok"` \| \{ `minSuccessful`: `number`; \} | 'all-ok' requires EVERY spawned child to have settled 'ok' when finish validates: a child still running counts against the policy, and so does a deliberately cancelled straggler (spawn nothing you do not need to succeed; zero spawned children are vacuously complete). { minSuccessful: N } requires at least N children settled 'ok' and reports every other child in degradedReasons. | `packages/core/dist/index.d.ts` |
| <a id="property-minspawnedchildren"></a> `minSpawnedChildren?` | `number` | The spawned-roster floor (RV507): finish is rejected when FEWER than this many children were spawned, under BOTH child policies. 'all-ok' alone treats zero spawned children as vacuously complete (spawn nothing you do not need to succeed), which lets a fan-out-shaped task settle ok without ever fanning out; the floor makes the intended decomposition binding. The journaled decision (and a rejection's error data) carries the actual `spawnedChildren` beside the configured floor, so a resume rolls the same verdict forward. Positive integer; policy only, never part of any identity. | `packages/core/dist/index.d.ts` |
| <a id="property-requireevidencefloor"></a> `requireEvidenceFloor?` | `boolean` | The binding evidence floor (RV1207, the sixteenth comparison run; default false). A salvage arm above accepts a limit child by the work it carries, which says nothing about the DECLARED evidence contract: in that run a worker settled 'limit' with 10 of 14 declared entries and was promoted through terminal-output salvage with the floor waived, so an 'all-ok' run reported status ok (completion 'partial') over an unmet contract. With this true, a child that declared an evidence contract it did not meet is NEVER promoted by a salvage arm: it counts against the policy exactly like an unsalvageable limit child, so 'all-ok' rejects and { minSuccessful: N } does not count it toward N. Salvage stays DIAGNOSTIC: the roster still records the arm that would have applied and the evidence verdict (marked `floorRequired` instead of `waivedBySalvage`), the degradedReasons name the shortfall with its counts, and the child's output stays visible through the digest and get_child_result exactly as before. A child with no declared contract, or one that met its floor, is untouched. | `packages/core/dist/index.d.ts` |

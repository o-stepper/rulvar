[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitSpec

# Interface: AdmitSpec

Defined in: [packages/core/src/orchestrator/admission.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L179)

What the admission point needs to know about one spawn.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry?` | `string`[] | Decomposition parent-LTID chain (relation 'decompose-child' only). | [packages/core/src/orchestrator/admission.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L221) |
| <a id="property-approach"></a> `approach?` | `string` | Raw approach tag; normalized by the engine. | [packages/core/src/orchestrator/admission.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L219) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Explicit child budget; clamped by childBudgetFraction. | [packages/core/src/orchestrator/admission.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L188) |
| <a id="property-childscope"></a> `childScope` | `string` | The child's journal scope; doubles as its budget account scope. | [packages/core/src/orchestrator/admission.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L184) |
| <a id="property-estcostusd"></a> `estCostUsd?` | `number` | Reserve hint; falls back to the flat engine default. | [packages/core/src/orchestrator/admission.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L190) |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length of the resolved profile (K_l); default 1, the single implicit rung. Under a termination account, a length beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2). | [packages/core/src/orchestrator/admission.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L234) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); absence mints a fresh lineage root. A continuation demands a causeRef: the seq of the entry that caused the rebirth. | [packages/core/src/orchestrator/admission.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L217) |
| <a id="property-name"></a> `name` | `string` | Registered workflow name or agent profile name; telemetry and cards only. | [packages/core/src/orchestrator/admission.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L182) |
| <a id="property-nodekey"></a> `nodeKey?` | `string` | The children-quota key (maxChildrenPerNode); defaults to parentAccountScope. Orchestrators pass their own scope so each node counts its own children. | [packages/core/src/orchestrator/admission.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L240) |
| <a id="property-origin"></a> `origin` | [`SpawnOrigin`](/api/@rulvar/core/type-aliases/SpawnOrigin.md) | - | [packages/core/src/orchestrator/admission.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L180) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | The nearest enclosing budget account of the spawner. | [packages/core/src/orchestrator/admission.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L186) |
| <a id="property-pendingreserveusd"></a> `pendingReserveUsd?` | `number` | Same-batch reserves already admitted read-only but not yet committed (a multi-op plan revision): the read-only branch adds them to this spawn's reserve so every embedded admit of one batch is dispatchable under the same snapshot, not just the first. | [packages/core/src/orchestrator/admission.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L197) |
| <a id="property-roster"></a> `roster?` | \{ `admittedChildren`: `number`; `floor`: `number`; `liveExposureUsd`: `number`; \} | The sequential roster feasibility inputs (RV2005), passed by the SINGLE spawn_agent path when acceptance.minSpawnedChildren is declared: the admission projects the whole REMAINING roster at this seat's own dispatch projection, live in-flight exposure included, and refuses the first infeasible seat typed 'roster_floor' before any child is paid. Batch seats never carry this: the RV1908 batchGate already judged their batch entire. | [packages/core/src/orchestrator/admission.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L207) |
| `roster.admittedChildren` | `number` | - | [packages/core/src/orchestrator/admission.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L209) |
| `roster.floor` | `number` | - | [packages/core/src/orchestrator/admission.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L208) |
| `roster.liveExposureUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L210) |
| <a id="property-signature"></a> `signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md)\&gt; | Coarse-signature identity inputs; unspecified fields canonize onto the deterministic legacy constants so signatures stay byte-stable (the toolset/schema registries land in M7-T05). | [packages/core/src/orchestrator/admission.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L227) |

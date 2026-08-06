[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitSpec

# Interface: AdmitSpec

Defined in: [packages/core/src/orchestrator/admission.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L178)

What the admission point needs to know about one spawn.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry?` | `string`[] | Decomposition parent-LTID chain (relation 'decompose-child' only). | [packages/core/src/orchestrator/admission.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L220) |
| <a id="property-approach"></a> `approach?` | `string` | Raw approach tag; normalized by the engine. | [packages/core/src/orchestrator/admission.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L218) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Explicit child budget; clamped by childBudgetFraction. | [packages/core/src/orchestrator/admission.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L187) |
| <a id="property-childscope"></a> `childScope` | `string` | The child's journal scope; doubles as its budget account scope. | [packages/core/src/orchestrator/admission.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L183) |
| <a id="property-estcostusd"></a> `estCostUsd?` | `number` | Reserve hint; falls back to the flat engine default. | [packages/core/src/orchestrator/admission.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L189) |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length of the resolved profile (K_l); default 1, the single implicit rung. Under a termination account, a length beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2). | [packages/core/src/orchestrator/admission.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L233) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); absence mints a fresh lineage root. A continuation demands a causeRef: the seq of the entry that caused the rebirth. | [packages/core/src/orchestrator/admission.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L216) |
| <a id="property-name"></a> `name` | `string` | Registered workflow name or agent profile name; telemetry and cards only. | [packages/core/src/orchestrator/admission.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L181) |
| <a id="property-nodekey"></a> `nodeKey?` | `string` | The children-quota key (maxChildrenPerNode); defaults to parentAccountScope. Orchestrators pass their own scope so each node counts its own children. | [packages/core/src/orchestrator/admission.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L239) |
| <a id="property-origin"></a> `origin` | [`SpawnOrigin`](/api/@rulvar/core/type-aliases/SpawnOrigin.md) | - | [packages/core/src/orchestrator/admission.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L179) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | The nearest enclosing budget account of the spawner. | [packages/core/src/orchestrator/admission.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L185) |
| <a id="property-pendingreserveusd"></a> `pendingReserveUsd?` | `number` | Same-batch reserves already admitted read-only but not yet committed (a multi-op plan revision): the read-only branch adds them to this spawn's reserve so every embedded admit of one batch is dispatchable under the same snapshot, not just the first. | [packages/core/src/orchestrator/admission.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L196) |
| <a id="property-roster"></a> `roster?` | \{ `admittedChildren`: `number`; `floor`: `number`; `liveExposureUsd`: `number`; \} | The sequential roster feasibility inputs (RV2005), passed by the SINGLE spawn_agent path when acceptance.minSpawnedChildren is declared: the admission projects the whole REMAINING roster at this seat's own dispatch projection, live in-flight exposure included, and refuses the first infeasible seat typed 'roster_floor' before any child is paid. Batch seats never carry this: the RV1908 batchGate already judged their batch entire. | [packages/core/src/orchestrator/admission.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L206) |
| `roster.admittedChildren` | `number` | - | [packages/core/src/orchestrator/admission.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L208) |
| `roster.floor` | `number` | - | [packages/core/src/orchestrator/admission.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L207) |
| `roster.liveExposureUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L209) |
| <a id="property-signature"></a> `signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md)\&gt; | Coarse-signature identity inputs; unspecified fields canonize onto the deterministic legacy constants so signatures stay byte-stable (the toolset/schema registries land in M7-T05). | [packages/core/src/orchestrator/admission.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L226) |

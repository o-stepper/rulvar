[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitSpec

# Interface: AdmitSpec

Defined in: [packages/core/src/orchestrator/admission.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L141)

What the admission point needs to know about one spawn.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry?` | `string`[] | Decomposition parent-LTID chain (relation 'decompose-child' only). | [packages/core/src/orchestrator/admission.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L169) |
| <a id="property-approach"></a> `approach?` | `string` | Raw approach tag; normalized by the engine. | [packages/core/src/orchestrator/admission.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L167) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Explicit child budget; clamped by childBudgetFraction. | [packages/core/src/orchestrator/admission.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L150) |
| <a id="property-childscope"></a> `childScope` | `string` | The child's journal scope; doubles as its budget account scope. | [packages/core/src/orchestrator/admission.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L146) |
| <a id="property-estcostusd"></a> `estCostUsd?` | `number` | Reserve hint; falls back to the flat engine default. | [packages/core/src/orchestrator/admission.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L152) |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length of the resolved profile (K_l); default 1, the single implicit rung. Under a termination account, a length beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2). | [packages/core/src/orchestrator/admission.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L182) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); absence mints a fresh lineage root. A continuation demands a causeRef: the seq of the entry that caused the rebirth. | [packages/core/src/orchestrator/admission.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L165) |
| <a id="property-name"></a> `name` | `string` | Registered workflow name or agent profile name; telemetry and cards only. | [packages/core/src/orchestrator/admission.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L144) |
| <a id="property-nodekey"></a> `nodeKey?` | `string` | The children-quota key (maxChildrenPerNode); defaults to parentAccountScope. Orchestrators pass their own scope so each node counts its own children. | [packages/core/src/orchestrator/admission.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L188) |
| <a id="property-origin"></a> `origin` | [`SpawnOrigin`](/api/@rulvar/core/type-aliases/SpawnOrigin.md) | - | [packages/core/src/orchestrator/admission.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L142) |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | The nearest enclosing budget account of the spawner. | [packages/core/src/orchestrator/admission.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L148) |
| <a id="property-pendingreserveusd"></a> `pendingReserveUsd?` | `number` | Same-batch reserves already admitted read-only but not yet committed (a multi-op plan revision): the read-only branch adds them to this spawn's reserve so every embedded admit of one batch is dispatchable under the same snapshot, not just the first. | [packages/core/src/orchestrator/admission.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L159) |
| <a id="property-signature"></a> `signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md)\&gt; | Coarse-signature identity inputs; unspecified fields canonize onto the deterministic legacy constants so signatures stay byte-stable (the toolset/schema registries land in M7-T05). | [packages/core/src/orchestrator/admission.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L175) |

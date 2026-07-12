[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmitSpec

# Interface: AdmitSpec

Defined in: `packages/core/dist/index.d.ts`

What the admission point needs to know about one spawn.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry?` | `string`[] | Decomposition parent-LTID chain (relation 'decompose-child' only). | `packages/core/dist/index.d.ts` |
| <a id="property-approach"></a> `approach?` | `string` | Raw approach tag; normalized by the engine. | `packages/core/dist/index.d.ts` |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Explicit child budget; clamped by childBudgetFraction. | `packages/core/dist/index.d.ts` |
| <a id="property-childscope"></a> `childScope` | `string` | The child's journal scope; doubles as its budget account scope. | `packages/core/dist/index.d.ts` |
| <a id="property-estcostusd"></a> `estCostUsd?` | `number` | Reserve hint; falls back to the flat engine default. | `packages/core/dist/index.d.ts` |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length of the resolved profile (K_l); default 1, the single implicit rung. Under a termination account, a length beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2). | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); absence mints a fresh lineage root. A continuation demands a causeRef: the seq of the entry that caused the rebirth. | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | Registered workflow name or agent profile name; telemetry and cards only. | `packages/core/dist/index.d.ts` |
| <a id="property-nodekey"></a> `nodeKey?` | `string` | The children-quota key (maxChildrenPerNode); defaults to parentAccountScope. Orchestrators pass their own scope so each node counts its own children. | `packages/core/dist/index.d.ts` |
| <a id="property-origin"></a> `origin` | [`SpawnOrigin`](/api/@rulvar/rulvar/type-aliases/SpawnOrigin.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-parentaccountscope"></a> `parentAccountScope` | `string` | The nearest enclosing budget account of the spawner. | `packages/core/dist/index.d.ts` |
| <a id="property-signature"></a> `signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/rulvar/interfaces/ApproachSignatureInputs.md)\&gt; | Coarse-signature identity inputs; unspecified fields canonize onto the deterministic legacy constants so signatures stay byte-stable (the toolset/schema registries land in M7-T05). | `packages/core/dist/index.d.ts` |

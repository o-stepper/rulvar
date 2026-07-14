[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalationReport

# Interface: EscalationReport

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blockers"></a> `blockers` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-costtodate"></a> `costToDate` | \{ `turns`: `number`; `usd`: `number`; \} | Runtime-filled; model-authored values are rejected at validation. | `packages/core/dist/index.d.ts` |
| `costToDate.turns` | `number` | - | `packages/core/dist/index.d.ts` |
| `costToDate.usd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | [`EscalationKind`](/api/@rulvar/rulvar/type-aliases/EscalationKind.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-proposeddecomposition"></a> `proposedDecomposition` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-revisedestimate"></a> `revisedEstimate` | \{ `turns`: `number`; `usd`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `revisedEstimate.turns` | `number` | - | `packages/core/dist/index.d.ts` |
| `revisedEstimate.usd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-salvage"></a> `salvage` | \{ `artifacts`: `string`[]; `transcriptRef`: `string`; `worktreePatchRef?`: `string`; \} | Runtime-filled; model-authored values are rejected at validation. | `packages/core/dist/index.d.ts` |
| `salvage.artifacts` | `string`[] | - | `packages/core/dist/index.d.ts` |
| `salvage.transcriptRef` | `string` | - | `packages/core/dist/index.d.ts` |
| `salvage.worktreePatchRef?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-scopedelta"></a> `scopeDelta` | `string` | - | `packages/core/dist/index.d.ts` |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalationRequest

# Interface: EscalationRequest

Defined in: `packages/core/dist/index.d.ts`

The model-facing request: the report minus the runtime-filled fields.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-blockers"></a> `blockers?` | `string`[] | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | [`EscalationKind`](/api/@rulvar/rulvar/type-aliases/EscalationKind.md) | `packages/core/dist/index.d.ts` |
| <a id="property-proposeddecomposition"></a> `proposedDecomposition?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] | `packages/core/dist/index.d.ts` |
| <a id="property-revisedestimate"></a> `revisedEstimate` | \{ `turns`: `number`; `usd`: `number`; \} | `packages/core/dist/index.d.ts` |
| `revisedEstimate.turns` | `number` | `packages/core/dist/index.d.ts` |
| `revisedEstimate.usd` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-scopedelta"></a> `scopeDelta` | `string` | `packages/core/dist/index.d.ts` |

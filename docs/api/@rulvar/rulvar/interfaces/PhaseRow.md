[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PhaseRow

# Interface: PhaseRow

Defined in: `packages/core/dist/index.d.ts`

One phase activation of one agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-durationms"></a> `durationMs` | `number` | 0 until the end event arrives, and on replayed rows. | `packages/core/dist/index.d.ts` |
| <a id="property-invocation"></a> `invocation` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-open"></a> `open` | `boolean` | True when the phase's end event never arrived. | `packages/core/dist/index.d.ts` |
| <a id="property-outcome"></a> `outcome?` | `"ok"` \| `"error"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-retries"></a> `retries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectDeclaredDecision

# Interface: EffectDeclaredDecision

Defined in: `packages/core/dist/index.d.ts`

The descriptive `declared` state (RFC section 3.1, item 1): the
effect is described but not yet authorized; no provider interaction
is legal. The bounded wait for authorization rides the licensing
approval's own `deadlineAt` (refused at intake without one), so this
record is descriptive, never load-bearing for consumption.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-amountordocumenthash"></a> `amountOrDocumentHash?` | `string` | Monetary amount or document hash, per class; descriptive. | `packages/core/dist/index.d.ts` |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/rulvar/type-aliases/EffectCapabilityRow.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_declared"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/rulvar/type-aliases/EffectClass.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |

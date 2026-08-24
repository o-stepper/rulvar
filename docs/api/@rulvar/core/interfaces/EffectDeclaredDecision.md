[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectDeclaredDecision

# Interface: EffectDeclaredDecision

Defined in: [packages/core/src/effects/types.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L121)

The descriptive `declared` state (RFC section 3.1, item 1): the
effect is described but not yet authorized; no provider interaction
is legal. The bounded wait for authorization rides the licensing
approval's own `deadlineAt` (refused at intake without one), so this
record is descriptive, never load-bearing for consumption.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-amountordocumenthash"></a> `amountOrDocumentHash?` | `string` | Monetary amount or document hash, per class; descriptive. | [packages/core/src/effects/types.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L129) |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | [packages/core/src/effects/types.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L127) |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/core/type-aliases/EffectCapabilityRow.md) | - | [packages/core/src/effects/types.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L126) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_declared"` | - | [packages/core/src/effects/types.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L122) |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/core/type-aliases/EffectClass.md) | - | [packages/core/src/effects/types.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L125) |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | [packages/core/src/effects/types.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L124) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L123) |

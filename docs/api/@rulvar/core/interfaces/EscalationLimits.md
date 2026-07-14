[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationLimits

# Interface: EscalationLimits

Defined in: [packages/core/src/journal/lineage.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L106)

Lineage limits, monotonically consumed and never replenished (DEF-3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxattemptsperlogicaltask"></a> `maxAttemptsPerLogicalTask` | `number` | Default 8. | [packages/core/src/journal/lineage.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L110) |
| <a id="property-maxescalationsperlogicaltask"></a> `maxEscalationsPerLogicalTask` | `number` | Default 2; the old name maxEscalationsPerNode is rejected (XF-10). | [packages/core/src/journal/lineage.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L108) |

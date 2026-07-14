[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KnowledgeSnapshot

# Interface: KnowledgeSnapshot

Defined in: [packages/core/src/l0/spi/knowledge.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L83)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claims"></a> `claims` | [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] | - | [packages/core/src/l0/spi/knowledge.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L88) |
| <a id="property-hash"></a> `hash` | `string` | Deterministic content hash of the claims array. | [packages/core/src/l0/spi/knowledge.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L87) |
| <a id="property-version"></a> `version` | `number` | Monotonic; the CAS token of commit. | [packages/core/src/l0/spi/knowledge.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L85) |

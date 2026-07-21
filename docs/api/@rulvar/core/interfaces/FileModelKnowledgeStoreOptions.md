[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FileModelKnowledgeStoreOptions

# Interface: FileModelKnowledgeStoreOptions

Defined in: [packages/core/src/knowledge/file-store.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L96)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-activeclaimscap"></a> `activeClaimsCap?` | `number` | Active claims per (model, taskClass); default 8. A nonnegative integer (zero refuses every active claim), validated at construction: the enforcement compares `count > cap`, and every comparison with NaN is false, so an unvalidated NaN or Infinity silently disabled the cap (v1.35.0 review P2-5). | [packages/core/src/knowledge/file-store.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L106) |
| <a id="property-path"></a> `path?` | `string` | Default './rulvar.models.json'. | [packages/core/src/knowledge/file-store.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L98) |

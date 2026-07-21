[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FileModelKnowledgeStoreOptions

# Interface: FileModelKnowledgeStoreOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-activeclaimscap"></a> `activeClaimsCap?` | `number` | Active claims per (model, taskClass); default 8. A nonnegative integer (zero refuses every active claim), validated at construction: the enforcement compares `count > cap`, and every comparison with NaN is false, so an unvalidated NaN or Infinity silently disabled the cap (v1.35.0 review P2-5). | `packages/core/dist/index.d.ts` |
| <a id="property-path"></a> `path?` | `string` | Default './rulvar.models.json'. | `packages/core/dist/index.d.ts` |

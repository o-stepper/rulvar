[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Contradiction

# Interface: Contradiction

Defined in: `packages/core/dist/index.d.ts`

One cited location two children read differently.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The cited location both readings point at, e.g. 'src/retry.ts:33'. | `packages/core/dist/index.d.ts` |
| <a id="property-claims"></a> `claims` | [`ContradictionClaim`](/api/@rulvar/rulvar/interfaces/ContradictionClaim.md)[] | Every reading of that key at that anchor, in first-seen order. | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key` | `string` | The key both readings name, e.g. 'attempts'. | `packages/core/dist/index.d.ts` |

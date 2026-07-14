[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RandIdentityInput

# Interface: RandIdentityInput

Defined in: `packages/core/dist/index.d.ts`

Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key?` | `string` | ctx.random(key) provides a stable alternative to positional binding. | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"rand"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-subtype"></a> `subtype` | `"now"` \| `"random"` \| `"uuid"` | - | `packages/core/dist/index.d.ts` |

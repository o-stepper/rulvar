[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RandIdentityInput

# Interface: RandIdentityInput

Defined in: [packages/core/src/journal/identity.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L68)

Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key?` | `string` | ctx.random(key) provides a stable alternative to positional binding. | [packages/core/src/journal/identity.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L72) |
| <a id="property-kind"></a> `kind` | `"rand"` | - | [packages/core/src/journal/identity.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L69) |
| <a id="property-subtype"></a> `subtype` | `"now"` \| `"random"` \| `"uuid"` | - | [packages/core/src/journal/identity.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L70) |

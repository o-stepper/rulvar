[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CacheHint

# Interface: CacheHint

Defined in: [packages/core/src/l0/messages.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L91)

Provider-neutral declaration of intended prompt-cache boundaries.
Transport-level cost optimization only: MUST NOT enter IdentityInput and
MUST NOT change response semantics (docs/04, section "cacheHint").

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-breakpoints"></a> `breakpoints` | \{ `after`: \| `"system"` \| \{ `messageIndex`: `number`; \} \| `"tools"`; `ttl?`: [`CacheTtl`](/api/@rulvar/core/type-aliases/CacheTtl.md); \}[] | Desired cache boundaries, ordered from shallowest to deepest prefix. | [packages/core/src/l0/messages.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L93) |

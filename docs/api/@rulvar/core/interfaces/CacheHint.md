[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CacheHint

# Interface: CacheHint

Defined in: [packages/core/src/l0/messages.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L86)

Provider-neutral declaration of intended prompt-cache boundaries.
Transport-level cost optimization only: MUST NOT enter IdentityInput and
MUST NOT change response semantics.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-breakpoints"></a> `breakpoints` | \{ `after`: \| `"system"` \| `"tools"` \| \{ `messageIndex`: `number`; \}; `ttl?`: [`CacheTtl`](/api/@rulvar/core/type-aliases/CacheTtl.md); \}[] | Desired cache boundaries, ordered from shallowest to deepest prefix. | [packages/core/src/l0/messages.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L88) |

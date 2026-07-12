[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CacheHint

# Interface: CacheHint

Defined in: `packages/core/dist/index.d.ts`

Provider-neutral declaration of intended prompt-cache boundaries.
Transport-level cost optimization only: MUST NOT enter IdentityInput and
MUST NOT change response semantics.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-breakpoints"></a> `breakpoints` | \{ `after`: \| `"tools"` \| `"system"` \| \{ `messageIndex`: `number`; \}; `ttl?`: [`CacheTtl`](/api/@rulvar/rulvar/type-aliases/CacheTtl.md); \}[] | Desired cache boundaries, ordered from shallowest to deepest prefix. | `packages/core/dist/index.d.ts` |

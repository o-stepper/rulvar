[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelAdapterRegulatedPosture

# Interface: ModelAdapterRegulatedPosture

Defined in: `packages/core/dist/index.d.ts`

The posture a first-party model adapter chose at construction
(RV4204, the sixth comparison experiment): before it, only mcp()
and the AI SDK bridge attested, so `unrecognized >= 1` on nearly
every real compile and a `require-recognized` floor was
unsatisfiable by construction. The risk seams a model adapter
actually owns are its egress (where the wire bytes go) and its
caps-refresh pagination bound; both enter the hashed posture map,
so a moved base URL or a dropped bound moves the fingerprint.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-baseurlorigin"></a> `baseUrlOrigin?` | `string` | Present exactly under 'custom-base-url': the override's origin. | `packages/core/dist/index.d.ts` |
| <a id="property-capsbound"></a> `capsBound?` | \{ `declared`: `boolean`; `maxPages?`: `number`; \} | The caps-refresh pagination bound (RV2904), for adapters that expose one: `declared` mirrors whether the host capped the sweep, and the value rides beside it. Absent on adapters with no declarable bound. | `packages/core/dist/index.d.ts` |
| `capsBound.declared` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `capsBound.maxPages?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"model-adapter"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | The adapter id ('anthropic', 'openai'). | `packages/core/dist/index.d.ts` |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | `packages/core/dist/index.d.ts` |
| <a id="property-transport"></a> `transport` | `"official"` \| `"custom-base-url"` \| `"preconstructed-client"` | Where the adapter's wire bytes go: the provider's official endpoint, a declared base-URL override (its origin rides beside this value so the hash pins the egress), or a preconstructed client the adapter cannot see through, named honestly. | `packages/core/dist/index.d.ts` |

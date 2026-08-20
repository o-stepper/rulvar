[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelAdapterRegulatedPosture

# Interface: ModelAdapterRegulatedPosture

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L79)

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
| <a id="property-baseurlorigin"></a> `baseUrlOrigin?` | `string` | Present exactly under 'custom-base-url': the override's origin. | [packages/core/src/l0/spi/regulated-posture.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L93) |
| <a id="property-capsbound"></a> `capsBound?` | \{ `declared`: `boolean`; `maxPages?`: `number`; \} | The caps-refresh pagination bound (RV2904), for adapters that expose one: `declared` mirrors whether the host capped the sweep, and the value rides beside it. Absent on adapters with no declarable bound. | [packages/core/src/l0/spi/regulated-posture.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L100) |
| `capsBound.declared` | `boolean` | - | [packages/core/src/l0/spi/regulated-posture.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L100) |
| `capsBound.maxPages?` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L100) |
| <a id="property-kind"></a> `kind` | `"model-adapter"` | - | [packages/core/src/l0/spi/regulated-posture.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L82) |
| <a id="property-name"></a> `name` | `string` | The adapter id ('anthropic', 'openai'). | [packages/core/src/l0/spi/regulated-posture.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L84) |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | [packages/core/src/l0/spi/regulated-posture.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L81) |
| <a id="property-transport"></a> `transport` | `"official"` \| `"custom-base-url"` \| `"preconstructed-client"` | Where the adapter's wire bytes go: the provider's official endpoint, a declared base-URL override (its origin rides beside this value so the hash pins the egress), or a preconstructed client the adapter cannot see through, named honestly. | [packages/core/src/l0/spi/regulated-posture.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L91) |

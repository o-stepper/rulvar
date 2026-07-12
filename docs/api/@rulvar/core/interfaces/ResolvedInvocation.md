[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolvedInvocation

# Interface: ResolvedInvocation

Defined in: [packages/core/src/model/router.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L85)

The resolved, scrubbed result of one invocation's resolution.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapterid"></a> `adapterId` | `string` | - | [packages/core/src/model/router.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L87) |
| <a id="property-canonical"></a> `canonical` | [`CanonicalModelSpec`](/api/@rulvar/core/type-aliases/CanonicalModelSpec.md) | Identity-facing canonical form. | [packages/core/src/model/router.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L97) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | - | [packages/core/src/model/router.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L95) |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:'. | [packages/core/src/model/router.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L89) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | - | [packages/core/src/model/router.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L94) |
| <a id="property-ref"></a> `ref` | `` `${string}:${string}` `` | - | [packages/core/src/model/router.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L86) |
| <a id="property-requestedeffort"></a> `requestedEffort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Effort REQUESTED (pre-scrub); this one enters identity. | [packages/core/src/model/router.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L93) |
| <a id="property-scrubs"></a> `scrubs` | [`ScrubNote`](/api/@rulvar/core/interfaces/ScrubNote.md)[] | - | [packages/core/src/model/router.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L98) |
| <a id="property-wireeffort"></a> `wireEffort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Effort to SEND (post-scrub); absent when unresolved or scrubbed. | [packages/core/src/model/router.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L91) |

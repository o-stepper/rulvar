[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolvedInvocation

# Interface: ResolvedInvocation

Defined in: [packages/core/src/model/router.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L90)

The resolved, scrubbed result of one invocation's resolution.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapterid"></a> `adapterId` | `string` | - | [packages/core/src/model/router.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L92) |
| <a id="property-canonical"></a> `canonical` | [`CanonicalModelSpec`](/api/@rulvar/core/type-aliases/CanonicalModelSpec.md) | Identity-facing canonical form (docs/04, section "Router and resolution chain"). | [packages/core/src/model/router.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L102) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | - | [packages/core/src/model/router.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L100) |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:'. | [packages/core/src/model/router.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L94) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | - | [packages/core/src/model/router.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L99) |
| <a id="property-ref"></a> `ref` | `` `${string}:${string}` `` | - | [packages/core/src/model/router.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L91) |
| <a id="property-requestedeffort"></a> `requestedEffort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Effort REQUESTED (pre-scrub); this one enters identity. | [packages/core/src/model/router.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L98) |
| <a id="property-scrubs"></a> `scrubs` | [`ScrubNote`](/api/@rulvar/core/interfaces/ScrubNote.md)[] | - | [packages/core/src/model/router.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L103) |
| <a id="property-wireeffort"></a> `wireEffort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Effort to SEND (post-scrub); absent when unresolved or scrubbed. | [packages/core/src/model/router.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L96) |

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolvedInvocation

# Interface: ResolvedInvocation

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The resolved, scrubbed result of one invocation's resolution.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapterid"></a> `adapterId` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-canonical"></a> `canonical` | [`CanonicalModelSpec`](/api/@rulvar/rulvar/type-aliases/CanonicalModelSpec.md) | Identity-facing canonical form (docs/04, section "Router and resolution chain"). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-fallbacks"></a> `fallbacks?` | `` `${string}:${string}` ``[] | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:'. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-ref"></a> `ref` | `` `${string}:${string}` `` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-requestedeffort"></a> `requestedEffort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Effort REQUESTED (pre-scrub); this one enters identity. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-scrubs"></a> `scrubs` | [`ScrubNote`](/api/@rulvar/rulvar/interfaces/ScrubNote.md)[] | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-wireeffort"></a> `wireEffort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Effort to SEND (post-scrub); absent when unresolved or scrubbed. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

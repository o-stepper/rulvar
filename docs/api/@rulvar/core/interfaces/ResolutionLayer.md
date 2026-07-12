[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionLayer

# Interface: ResolutionLayer

Defined in: [packages/core/src/model/router.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L73)

One layer's contribution to the resolution merge.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Explicit effort field; wins over a ModelChoice-carried effort within the layer. | [packages/core/src/model/router.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L79) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Applies to all roles at once (AgentOpts.model / profile.model). | [packages/core/src/model/router.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L75) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | Per-role override; wins over `model` within the same layer. | [packages/core/src/model/router.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L77) |

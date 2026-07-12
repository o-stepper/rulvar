[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionLayer

# Interface: ResolutionLayer

Defined in: `packages/core/dist/index.d.ts`

One layer's contribution to the resolution merge.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Explicit effort field; wins over a ModelChoice-carried effort within the layer. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Applies to all roles at once (AgentOpts.model / profile.model). | `packages/core/dist/index.d.ts` |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | Per-role override; wins over `model` within the same layer. | `packages/core/dist/index.d.ts` |

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolveModelInvocation

# Function: resolveModelInvocation()

```ts
function resolveModelInvocation(options): ResolvedInvocation;
```

Defined in: `packages/core/dist/index.d.ts`

Resolution runs on every model invocation, not once per agent: a layered
merge of { model, effort, providerOptions, fallbacks } in the order call
override > agent profile > workflow defaults > engine defaults, with the
invocation role attached as a tag.
After resolution the router reads ModelCaps and scrubs illegal
parameters visibly: unsupported effort is removed from the wire but
kept in identity; sampling params rejected by the model are removed
from the adapter's namespace, never silently sent.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `call?`: [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md); `capsOf`: (`ref`) => [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md); `engine?`: [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md); `floors?`: [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md); `profile?`: [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md); `role`: [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md); `taskClass?`: `string`; `workflow?`: [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md); \} |
| `options.call?` | [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md) |
| `options.capsOf` | (`ref`) => [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) |
| `options.engine?` | [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md) |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) |
| `options.profile?` | [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md) |
| `options.role` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) |
| `options.taskClass?` | `string` |
| `options.workflow?` | [`ResolutionLayer`](/api/@rulvar/rulvar/interfaces/ResolutionLayer.md) |

## Returns

[`ResolvedInvocation`](/api/@rulvar/rulvar/interfaces/ResolvedInvocation.md)

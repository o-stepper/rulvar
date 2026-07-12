[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveModelInvocation

# Function: resolveModelInvocation()

```ts
function resolveModelInvocation(options): ResolvedInvocation;
```

Defined in: [packages/core/src/model/router.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L199)

Resolution runs on every model invocation, not once per agent: a layered
merge of { model, effort, providerOptions, fallbacks } in the order call
override > agent profile > workflow defaults > engine defaults, with the
invocation role attached as a tag (docs/04, section "Resolution chain").
After resolution the router reads ModelCaps and scrubs illegal
parameters visibly: unsupported effort is removed from the wire but
kept in identity; sampling params rejected by the model are removed
from the adapter's namespace, never silently sent.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `call?`: [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md); `capsOf`: (`ref`) => [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md); `engine?`: [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md); `floors?`: [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md); `profile?`: [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md); `role`: [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md); `taskClass?`: `string`; `workflow?`: [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md); \} | - |
| `options.call?` | [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md) | - |
| `options.capsOf` | (`ref`) => [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md) | - |
| `options.engine?` | [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md) | - |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md) | Hard router constraints; violation is a typed ConfigError (M4-T09). |
| `options.profile?` | [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md) | - |
| `options.role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - |
| `options.taskClass?` | `string` | Profile-declared task class; absent = unclassified, byRole only. |
| `options.workflow?` | [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md) | - |

## Returns

[`ResolvedInvocation`](/api/@rulvar/core/interfaces/ResolvedInvocation.md)

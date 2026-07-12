[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / roleConfiguredInRouting

# Function: roleConfiguredInRouting()

```ts
function roleConfiguredInRouting(role, layers): boolean;
```

Defined in: [packages/core/src/model/roles.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L85)

True when any resolution layer configures the given role in its routing
map. This is the finalize TRIGGER: firing is decided by the presence of
a routing entry at any layer; the model it fires ON still resolves
through the full chain (a higher layer's all-roles `model` may override
the routed choice per docs/04, section 8.2).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) |
| `layers` | ( \| [`ResolutionLayer`](/api/@rulvar/core/interfaces/ResolutionLayer.md) \| `undefined`)[] |

## Returns

`boolean`

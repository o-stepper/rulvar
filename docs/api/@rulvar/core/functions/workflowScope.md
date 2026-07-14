[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / workflowScope

# Function: workflowScope()

```ts
function workflowScope(
   parent, 
   name, 
   ordinal): string;
```

Defined in: [packages/core/src/journal/scope.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L34)

ctx.workflow child scope: `wf:<name>:<ordinal>` (ordinal counts invocations of that name).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `parent` | `string` |
| `name` | `string` |
| `ordinal` | `number` |

## Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / workflowScope

# Function: workflowScope()

```ts
function workflowScope(
   parent, 
   name, 
   ordinal): string;
```

Defined in: `packages/core/dist/index.d.ts`

ctx.workflow child scope: `wf:<name>:<ordinal>` (ordinal counts invocations of that name).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `parent` | `string` |
| `name` | `string` |
| `ordinal` | `number` |

## Returns

`string`

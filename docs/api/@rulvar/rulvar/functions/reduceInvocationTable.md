[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reduceInvocationTable

# Function: reduceInvocationTable()

```ts
function reduceInvocationTable(events): InvocationTable;
```

Defined in: `packages/core/dist/index.d.ts`

Reduces one run's event stream (or any slice of it) to the invocation
table. Feed it the events in emission order; both a live stream and a
replayed one produce the same usage and cost columns.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | `Iterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt; |

## Returns

[`InvocationTable`](/api/@rulvar/rulvar/interfaces/InvocationTable.md)

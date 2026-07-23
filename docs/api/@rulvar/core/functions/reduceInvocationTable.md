[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reduceInvocationTable

# Function: reduceInvocationTable()

```ts
function reduceInvocationTable(events): InvocationTable;
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L84)

Reduces one run's event stream (or any slice of it) to the invocation
table. Feed it the events in emission order; both a live stream and a
replayed one produce the same usage and cost columns.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | `Iterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt; |

## Returns

[`InvocationTable`](/api/@rulvar/core/interfaces/InvocationTable.md)

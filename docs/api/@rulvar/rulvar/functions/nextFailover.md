[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / nextFailover

# Function: nextFailover()

```ts
function nextFailover(
   targets, 
   trigger, 
   from): number | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The next target index past `from` that serves `trigger`, or undefined
when the chain is exhausted. Index 0 is the primary; the chain never
moves backwards (sticky failover).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `targets` | `Pick`\&lt;[`FailoverTarget`](/api/@rulvar/rulvar/interfaces/FailoverTarget.md), `"on"`\&gt;[] |
| `trigger` | [`FailoverTrigger`](/api/@rulvar/rulvar/type-aliases/FailoverTrigger.md) |
| `from` | `number` |

## Returns

`number` \| `undefined`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / nextFailover

# Function: nextFailover()

```ts
function nextFailover(
   targets, 
   trigger, 
   from): number | undefined;
```

Defined in: [packages/core/src/model/failover.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L51)

The next target index past `from` that serves `trigger`, or undefined
when the chain is exhausted. Index 0 is the primary; the chain never
moves backwards (sticky failover).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `targets` | `Pick`\&lt;[`FailoverTarget`](/api/@rulvar/core/interfaces/FailoverTarget.md), `"on"`\&gt;[] |
| `trigger` | [`FailoverTrigger`](/api/@rulvar/core/type-aliases/FailoverTrigger.md) |
| `from` | `number` |

## Returns

`number` \| `undefined`

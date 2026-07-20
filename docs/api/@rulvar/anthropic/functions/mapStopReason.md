[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / mapStopReason

# Function: mapStopReason()

```ts
function mapStopReason(stopReason, stopDetails): MappedStop;
```

Defined in: [packages/anthropic/src/wire.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L349)

The stop-reason table. pause_turn never surfaces as
a canonical finish: the adapter continues internally.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stopReason` | `string` \| `null` \| `undefined` |
| `stopDetails` | `Record`\&lt;`string`, `unknown`\&gt; \| `null` \| `undefined` |

## Returns

[`MappedStop`](/api/@rulvar/anthropic/interfaces/MappedStop.md)

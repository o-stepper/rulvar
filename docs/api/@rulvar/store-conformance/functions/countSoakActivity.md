[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / countSoakActivity

# Function: countSoakActivity()

```ts
function countSoakActivity(events): SoakActivity;
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:645](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L645)

Derives the activity counters the quorum is judged against.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | readonly [`SoakEvent`](/api/@rulvar/store-conformance/type-aliases/SoakEvent.md)[] |

## Returns

[`SoakActivity`](/api/@rulvar/store-conformance/interfaces/SoakActivity.md)

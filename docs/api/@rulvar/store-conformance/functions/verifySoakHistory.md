[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / verifySoakHistory

# Function: verifySoakHistory()

```ts
function verifySoakHistory(
   fixture, 
   events, 
runId): Promise<string[]>;
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:713](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L713)

The pure referee: rebuilds the serial history from the merged report
events and diffs it against the actual post-storm store state.
Returns every violation as a descriptive string; an empty array means
the fencing promise held for the whole storm.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fixture` | [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) |
| `events` | readonly [`SoakEvent`](/api/@rulvar/store-conformance/type-aliases/SoakEvent.md)[] |
| `runId` | `string` |

## Returns

`Promise`\&lt;`string`[]\&gt;

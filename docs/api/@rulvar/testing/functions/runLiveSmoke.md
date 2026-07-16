[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / runLiveSmoke

# Function: runLiveSmoke()

```ts
function runLiveSmoke(
   adapter, 
   req, 
options?): Promise<LiveSmokeOutcome>;
```

Defined in: [packages/testing/src/live.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L76)

Drains `adapter.stream(req)` with a bounded retry policy and classifies
the outcome instead of throwing:

- `'ok'`: a `finish` event arrived (the events of the successful
  attempt are included for further assertions).
- `'failed'`: a terminal error with `retryable: false`; never retried,
  diagnostics preserved.
- `'exhausted'`: every attempt ended in a `retryable: true` error; the
  per-attempt errors are preserved in order.
- `'no-terminal'`: the stream ended with neither `finish` nor `error`,
  which violates the provider SPI; never retried (spending again on a
  misbehaving adapter is wrong).

Retries only ever follow typed retryable errors, so a live smoke never
converts a real adapter failure into a pass and never spends more than
`attempts` calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md), `"stream"`\&gt; |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `options?` | [`RunLiveSmokeOptions`](/api/@rulvar/testing/interfaces/RunLiveSmokeOptions.md) |

## Returns

`Promise`\&lt;[`LiveSmokeOutcome`](/api/@rulvar/testing/type-aliases/LiveSmokeOutcome.md)\&gt;

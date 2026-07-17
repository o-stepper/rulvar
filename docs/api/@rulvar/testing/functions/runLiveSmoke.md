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

Defined in: [packages/testing/src/live.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L124)

Drains `adapter.stream(req)` with a bounded retry policy and classifies
the outcome instead of throwing:

- `'ok'`: the stream ended on a single terminal `finish` (the events of
  the successful attempt are included for further assertions).
- `'failed'`: a terminal error with `retryable: false`; never retried,
  diagnostics preserved.
- `'exhausted'`: every attempt ended in a `retryable: true` error; the
  per-attempt errors are preserved in order.
- `'no-terminal'`: the stream ended with neither `finish` nor `error`,
  which violates the provider SPI; never retried (spending again on a
  misbehaving adapter is wrong).
- `'contract-violation'`: the stream carried more than one terminal
  event (`'multiple-terminals'`, e.g. an error followed by a finish) or
  its single terminal was not the final event
  (`'terminal-not-final'`). Equally an SPI violation, equally never
  retried, and never reported as a pass.

Retries only ever follow a well-formed stream whose single final
terminal is a typed retryable error, so a live smoke never converts a
real adapter failure or a malformed stream into a pass and never
spends more than `attempts` calls. Options are validated first:
invalid `attempts` or `baseDelayMs` reject with ConfigError before any
adapter call.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md), `"stream"`\&gt; |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `options?` | [`RunLiveSmokeOptions`](/api/@rulvar/testing/interfaces/RunLiveSmokeOptions.md) |

## Returns

`Promise`\&lt;[`LiveSmokeOutcome`](/api/@rulvar/testing/type-aliases/LiveSmokeOutcome.md)\&gt;

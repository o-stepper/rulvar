[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / record

# Function: record()

```ts
function record(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L147)

Wraps live adapters for recording: every stream that completes with
exactly one terminal event (finish or error) appends one redacted
row to the cassette JSONL. A stream that ends without a terminal
(a requested abort or a truncated read), throws, or violates the
adapter contract (a second terminal, data after the terminal)
appends nothing, so a cassette row is always the record of one
completed exchange (v1.28.0 review P2). The wrapped adapters are
drop-in: same ids, providers, caps, and event streams.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `adapters`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `redact?`: [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md); \} |
| `options.adapters` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] |
| `options.cassette` | `string` |
| `options.redact?` | [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / record

# Function: record()

```ts
function record(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L243)

Wraps live adapters for recording: every stream that completes with
exactly one terminal event (finish or error) appends one redacted
row to the cassette JSONL. A stream that ends without a terminal
(a requested abort or a truncated read), throws, or violates the
adapter contract (a second terminal, data after the terminal)
appends nothing, so a cassette row is always the record of one
completed exchange (v1.28.0 review P2). Every call also claims a
per `(adapterId, requestHash)` occurrence number synchronously in
the `stream()` call itself and persists it on the completed row,
so replay can restore the caller to response association even when
concurrent identical calls completed out of order (v1.31.0 review
P2). A later `record()` call on the same cassette file is an
appending session: the existing file is read and validated first
(a target that was never a cassette, a header whose hashVersion is
not the one this build records under, and a file whose occurrence
numbering is already ambiguous all refuse with a typed
ConfigError), and every hash counter is seeded past the numbers
already on disk, so the numbering continues where the file left
off instead of restarting at zero (v1.32.0 review P2). One
recorder session may be active on a cassette at a time: two
concurrently constructed recorders seed identically and claim
colliding numbers, which replay refuses as ambiguous instead of
silently serving either order. The wrapped adapters are drop-in:
same ids, providers, caps, and event streams.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `adapters`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `redact?`: [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md); \} |
| `options.adapters` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] |
| `options.cassette` | `string` |
| `options.redact?` | [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]

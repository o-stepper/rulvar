[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / replay

# Function: replay()

```ts
function replay(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:621](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L621)

Builds replay adapters from a cassette. `onMiss: 'throw'` is the
hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
matching live adapter in `adapters` (a development convenience only).

Repeated hashes replay in file order (v1.29.0 review P2): rows
sharing a `(adapterId, requestHash)` key form an ordered occurrence
list, and every `stream()` call consumes exactly one occurrence,
allocated synchronously inside the call itself, so two concurrent
identical requests can never be served the same recorded exchange.
A call after the last occurrence is a miss: under `onMiss: 'throw'`
it raises a VcrMissError whose `recordedOccurrences` says the hash
WAS recorded but is exhausted, and under `'passthrough'` it
forwards to the live adapter exactly like a never-recorded request.

Before serving anything, replay also enforces what `record` has
guaranteed since v1.29.0: every row's event stream ends with
exactly one terminal event (finish or error), and all caps
snapshots for one `(adapterId, model)` agree, since the replay
adapter can only report one caps truth per model. Violations throw
a typed ConfigError naming the cassette and row.

The rebuilt adapter restores the recorded provider and
usageSemantics declarations (v1.30.0 review P2), so the fresh
journal of a replayed run carries the same provenance stamp the
recorded run got instead of silently reading like an entry from
before the stamp existed. All rows of one adapter must agree on
both declarations; a conflict refuses with a typed ConfigError
before anything is served. A cassette recorded before v1.31.0
stores no usageSemantics, so its replays stamp nothing (documented
historical laxity).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `adapters?`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `onMiss`: `"throw"` \| `"passthrough"`; \} | - |
| `options.adapters?` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] | Live adapters for the passthrough mode. |
| `options.cassette` | `string` | - |
| `options.onMiss` | `"throw"` \| `"passthrough"` | - |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]

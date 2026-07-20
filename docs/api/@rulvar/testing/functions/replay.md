[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / replay

# Function: replay()

```ts
function replay(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:802](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L802)

Builds replay adapters from a cassette. `onMiss: 'throw'` is the
hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
matching live adapter in `adapters` (a development convenience only).

Repeated hashes replay as ordered occurrences (v1.29.0 review P2):
rows sharing a `(adapterId, requestHash)` key form an ordered
occurrence list, and every `stream()` call consumes exactly one
occurrence, allocated synchronously inside the call itself, so two
concurrent identical requests can never be served the same
recorded exchange. The list is sorted by the recorded `occurrence`
numbers when every row of the group carries one, so concurrent
identical calls whose live completions were appended out of order
still replay to the callers that made them (v1.31.0 review P2); a
group with any unnumbered row (recorded before v1.32.0) keeps file
order. A duplicate occurrence inside a fully numbered group
refuses the whole cassette with a typed ConfigError naming the
adapter and hash: it means two recorder sessions wrote the file
concurrently, and serving either order would hand a caller the
wrong exchange (v1.32.0 review P2).
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
historical laxity). Under `onMiss: 'passthrough'` the recorded
declarations must also match the live adapter's, absent versus
present included, because a live served miss is journaled under
the wrapper's declarations; a mismatch refuses at construction
(v1.31.0 review P2). An adapter with no recorded rows keeps the
live adapter's own declarations, so the wrapper stays a metadata
preserving drop in.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `adapters?`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `onMiss`: `"throw"` \| `"passthrough"`; \} | - |
| `options.adapters?` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] | Live adapters for the passthrough mode. |
| `options.cassette` | `string` | - |
| `options.onMiss` | `"throw"` \| `"passthrough"` | - |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]

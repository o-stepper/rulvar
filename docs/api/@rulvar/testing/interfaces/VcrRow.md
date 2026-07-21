[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / VcrRow

# Interface: VcrRow

Defined in: [packages/testing/src/vcr.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L37)

One recorded exchange; a cassette is one JSON header line plus rows.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapterid"></a> `adapterId` | `string` | - | [packages/testing/src/vcr.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L38) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | Caps snapshot for the request's model at record time. | [packages/testing/src/vcr.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L76) |
| <a id="property-events"></a> `events` | [`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)[] | Redacted event stream, replayed verbatim. | [packages/testing/src/vcr.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L74) |
| <a id="property-model"></a> `model` | `string` | - | [packages/testing/src/vcr.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L77) |
| <a id="property-occurrence"></a> `occurrence?` | `number` | Zero based per `(adapterId, requestHash)` call counter, claimed synchronously when the recorded `stream()` call was made (v1.31.0 review P2): rows are appended in COMPLETION order, so without this number two concurrent identical live calls that finish out of order would swap callers at replay, which hands occurrences out in caller order. Replay sorts same hash rows by it when every row of the group carries one; absent in cassettes recorded before v1.32.0, whose same hash rows keep file order. An aborted or failed call claims a number but appends no row, so gaps in the numbering are valid. An appending `record()` session seeds its counters past the numbers already on disk, so the numbering continues across sequential sessions; a duplicate number inside a fully numbered group refuses replay as ambiguous (v1.32.0 review P2). The numbering ends at `Number.MAX_SAFE_INTEGER`: a session refuses with a typed ConfigError to claim a number past it, before dispatching the provider and before touching the file (v1.33.0 review P3). | [packages/testing/src/vcr.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L69) |
| <a id="property-provider"></a> `provider?` | `string` | - | [packages/testing/src/vcr.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L39) |
| <a id="property-request"></a> `request` | `unknown` | Redacted canonical request, for humans and drift review. | [packages/testing/src/vcr.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L72) |
| <a id="property-requesthash"></a> `requestHash` | `string` | - | [packages/testing/src/vcr.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L70) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | The recording adapter's declared usageSemantics snapshot (v1.30.0 review P2): replay restores it on the rebuilt adapter, so the fresh journal of a replayed run carries the same provenance stamp the recorded run got. Absent when the recording adapter declared none, and in every cassette recorded before v1.31.0, whose replays therefore stamp nothing (documented historical laxity; an unstamped entry reads as recorded before the stamp existed). | [packages/testing/src/vcr.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L49) |

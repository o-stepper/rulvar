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
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | Caps snapshot for the request's model at record time. | [packages/testing/src/vcr.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L56) |
| <a id="property-events"></a> `events` | [`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)[] | Redacted event stream, replayed verbatim. | [packages/testing/src/vcr.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L54) |
| <a id="property-model"></a> `model` | `string` | - | [packages/testing/src/vcr.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L57) |
| <a id="property-provider"></a> `provider?` | `string` | - | [packages/testing/src/vcr.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L39) |
| <a id="property-request"></a> `request` | `unknown` | Redacted canonical request, for humans and drift review. | [packages/testing/src/vcr.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L52) |
| <a id="property-requesthash"></a> `requestHash` | `string` | - | [packages/testing/src/vcr.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L50) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | The recording adapter's declared usageSemantics snapshot (v1.30.0 review P2): replay restores it on the rebuilt adapter, so the fresh journal of a replayed run carries the same provenance stamp the recorded run got. Absent when the recording adapter declared none, and in every cassette recorded before v1.31.0, whose replays therefore stamp nothing (documented historical laxity; an unstamped entry reads as recorded before the stamp existed). | [packages/testing/src/vcr.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L49) |

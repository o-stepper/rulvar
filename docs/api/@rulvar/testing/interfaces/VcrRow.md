[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / VcrRow

# Interface: VcrRow

Defined in: [packages/testing/src/vcr.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L33)

One recorded exchange; a cassette is one JSON header line plus rows.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapterid"></a> `adapterId` | `string` | - | [packages/testing/src/vcr.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L34) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | Caps snapshot for the request's model at record time. | [packages/testing/src/vcr.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L42) |
| <a id="property-events"></a> `events` | [`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)[] | Redacted event stream, replayed verbatim. | [packages/testing/src/vcr.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L40) |
| <a id="property-model"></a> `model` | `string` | - | [packages/testing/src/vcr.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L43) |
| <a id="property-provider"></a> `provider?` | `string` | - | [packages/testing/src/vcr.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L35) |
| <a id="property-request"></a> `request` | `unknown` | Redacted canonical request, for humans and drift review. | [packages/testing/src/vcr.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L38) |
| <a id="property-requesthash"></a> `requestHash` | `string` | - | [packages/testing/src/vcr.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L36) |

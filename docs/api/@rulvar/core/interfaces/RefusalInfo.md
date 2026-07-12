[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefusalInfo

# Interface: RefusalInfo

Defined in: [packages/core/src/l0/messages.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L147)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-provider"></a> `provider` | `string` | Adapter id. | [packages/core/src/l0/messages.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L149) |
| <a id="property-stopdetails"></a> `stopDetails?` | \{ `category?`: `string`; `explanation?`: `string`; `type?`: `string`; \} | Provider stop details, passed through when available. | [packages/core/src/l0/messages.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L151) |
| `stopDetails.category?` | `string` | - | [packages/core/src/l0/messages.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L153) |
| `stopDetails.explanation?` | `string` | - | [packages/core/src/l0/messages.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L154) |
| `stopDetails.type?` | `string` | - | [packages/core/src/l0/messages.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L152) |

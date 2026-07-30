[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefusalInfo

# Interface: RefusalInfo

Defined in: [packages/core/src/l0/messages.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L152)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-provider"></a> `provider` | `string` | Adapter id. | [packages/core/src/l0/messages.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L154) |
| <a id="property-stopdetails"></a> `stopDetails?` | \{ `category?`: `string`; `explanation?`: `string`; `type?`: `string`; \} | Provider stop details, passed through when available. | [packages/core/src/l0/messages.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L156) |
| `stopDetails.category?` | `string` | - | [packages/core/src/l0/messages.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L158) |
| `stopDetails.explanation?` | `string` | - | [packages/core/src/l0/messages.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L159) |
| `stopDetails.type?` | `string` | - | [packages/core/src/l0/messages.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L157) |

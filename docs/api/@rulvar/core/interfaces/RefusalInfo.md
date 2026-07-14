[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefusalInfo

# Interface: RefusalInfo

Defined in: [packages/core/src/l0/messages.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L140)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-provider"></a> `provider` | `string` | Adapter id. | [packages/core/src/l0/messages.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L142) |
| <a id="property-stopdetails"></a> `stopDetails?` | \{ `category?`: `string`; `explanation?`: `string`; `type?`: `string`; \} | Provider stop details, passed through when available. | [packages/core/src/l0/messages.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L144) |
| `stopDetails.category?` | `string` | - | [packages/core/src/l0/messages.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L146) |
| `stopDetails.explanation?` | `string` | - | [packages/core/src/l0/messages.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L147) |
| `stopDetails.type?` | `string` | - | [packages/core/src/l0/messages.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L145) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefusalInfo

# Interface: RefusalInfo

Defined in: [packages/core/src/l0/messages.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L173)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-provider"></a> `provider` | `string` | Adapter id. | [packages/core/src/l0/messages.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L175) |
| <a id="property-stopdetails"></a> `stopDetails?` | \{ `category?`: `string`; `explanation?`: `string`; `type?`: `string`; \} | Provider stop details, passed through when available. | [packages/core/src/l0/messages.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L177) |
| `stopDetails.category?` | `string` | - | [packages/core/src/l0/messages.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L179) |
| `stopDetails.explanation?` | `string` | - | [packages/core/src/l0/messages.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L180) |
| `stopDetails.type?` | `string` | - | [packages/core/src/l0/messages.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L178) |

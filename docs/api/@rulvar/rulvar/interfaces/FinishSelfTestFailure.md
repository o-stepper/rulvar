[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishSelfTestFailure

# Interface: FinishSelfTestFailure

Defined in: `packages/core/dist/index.d.ts`

One self test failure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fixture"></a> `fixture` | `"accept"` \| `"reject"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reasons"></a> `reasons` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-validator"></a> `validator?` | `string` | The rejecting validator on the accept side; absent on the vacuous reject side. | `packages/core/dist/index.d.ts` |

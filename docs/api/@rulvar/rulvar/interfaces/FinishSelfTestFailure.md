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
| <a id="property-validator"></a> `validator?` | `string` | The failing validator: the rejecting one on the accept side, the named one on a per validator reject golden (cycle 74); absent only on the vacuous single-fixture reject side. | `packages/core/dist/index.d.ts` |

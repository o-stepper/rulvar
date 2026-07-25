[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishSelfTestFailure

# Interface: FinishSelfTestFailure

Defined in: [packages/core/src/orchestrator/output-contract.ts:382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L382)

One self test failure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fixture"></a> `fixture` | `"reject"` \| `"accept"` | - | [packages/core/src/orchestrator/output-contract.ts:383](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L383) |
| <a id="property-reasons"></a> `reasons` | `string`[] | - | [packages/core/src/orchestrator/output-contract.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L386) |
| <a id="property-validator"></a> `validator?` | `string` | The rejecting validator on the accept side; absent on the vacuous reject side. | [packages/core/src/orchestrator/output-contract.ts:385](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L385) |

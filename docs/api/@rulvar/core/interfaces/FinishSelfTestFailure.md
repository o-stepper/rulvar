[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishSelfTestFailure

# Interface: FinishSelfTestFailure

Defined in: [packages/core/src/orchestrator/output-contract.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L626)

One self test failure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fixture"></a> `fixture` | `"reject"` \| `"accept"` | - | [packages/core/src/orchestrator/output-contract.ts:627](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L627) |
| <a id="property-reasons"></a> `reasons` | `string`[] | - | [packages/core/src/orchestrator/output-contract.ts:634](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L634) |
| <a id="property-validator"></a> `validator?` | `string` | The failing validator: the rejecting one on the accept side, the named one on a per validator reject golden (cycle 74); absent only on the vacuous single-fixture reject side. | [packages/core/src/orchestrator/output-contract.ts:633](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L633) |

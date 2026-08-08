[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishSelfTestFailure

# Interface: FinishSelfTestFailure

Defined in: [packages/core/src/orchestrator/output-contract.ts:825](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L825)

One self test failure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fixture"></a> `fixture` | `"reject"` \| `"accept"` | - | [packages/core/src/orchestrator/output-contract.ts:826](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L826) |
| <a id="property-reasons"></a> `reasons` | `string`[] | - | [packages/core/src/orchestrator/output-contract.ts:833](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L833) |
| <a id="property-validator"></a> `validator?` | `string` | The failing validator: the rejecting one on the accept side, the named one on a per validator reject golden (cycle 74); absent only on the vacuous single-fixture reject side. | [packages/core/src/orchestrator/output-contract.ts:832](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L832) |

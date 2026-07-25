[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishSelfTestFixtures

# Interface: FinishSelfTestFixtures

Defined in: [packages/core/src/orchestrator/output-contract.ts:374](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L374)

Golden fixtures of the construction self test.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-accept"></a> `accept?` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | Every configured validator must accept this input. | [packages/core/src/orchestrator/output-contract.ts:376](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L376) |
| <a id="property-reject"></a> `reject?` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | At least one configured validator must reject this input. | [packages/core/src/orchestrator/output-contract.ts:378](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L378) |

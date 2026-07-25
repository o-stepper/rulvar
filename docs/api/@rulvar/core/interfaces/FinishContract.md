[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContract

# Interface: FinishContract

Defined in: [packages/core/src/orchestrator/output-contract.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L68)

What [finishContract](/api/@rulvar/core/functions/finishContract.md) builds from a manifest.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-goldenaccept"></a> `goldenAccept` | `readonly` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | A generated fixture every contract validator accepts. | [packages/core/src/orchestrator/output-contract.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L78) |
| <a id="property-goldenreject"></a> `goldenReject?` | `readonly` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | A generated fixture at least one contract validator rejects. Absent when the manifest carries only upper bounds, because an empty result is then legitimately acceptable. | [packages/core/src/orchestrator/output-contract.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L84) |
| <a id="property-hash"></a> `hash` | `readonly` | `string` | sha256 hex over the JCS serialization of the normalized manifest. | [packages/core/src/orchestrator/output-contract.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L72) |
| <a id="property-manifest"></a> `manifest` | `readonly` | [`FinishContractManifest`](/api/@rulvar/core/interfaces/FinishContractManifest.md) | The normalized manifest (defaults applied), frozen. | [packages/core/src/orchestrator/output-contract.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L70) |
| <a id="property-promptlines"></a> `promptLines` | `readonly` | readonly `string`[] | The contract statement for the model, one demand per line. | [packages/core/src/orchestrator/output-contract.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L76) |
| <a id="property-validators"></a> `validators` | `readonly` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | The stock validators enforcing the manifest; names are 'contract-*'. | [packages/core/src/orchestrator/output-contract.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L74) |

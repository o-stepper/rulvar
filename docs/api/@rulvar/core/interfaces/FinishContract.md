[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContract

# Interface: FinishContract

Defined in: [packages/core/src/orchestrator/output-contract.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L113)

What [finishContract](/api/@rulvar/core/functions/finishContract.md) builds from a manifest. The whole bundle
is DEEPLY frozen (cycle 74): the nested manifest objects, the
sections array, the validators array, and each validator object, so
a post construction mutation throws instead of silently diverging
behavior from the journaled contract hash.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-goldenaccept"></a> `goldenAccept` | `readonly` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | A generated fixture every contract validator accepts. | [packages/core/src/orchestrator/output-contract.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L129) |
| <a id="property-goldenreject"></a> `goldenReject?` | `readonly` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | A generated fixture at least one contract validator rejects. Absent when the manifest carries only upper bounds, because an empty result is then legitimately acceptable. | [packages/core/src/orchestrator/output-contract.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L135) |
| <a id="property-goldenrejects"></a> `goldenRejects` | `readonly` | readonly [`FinishContractGoldenReject`](/api/@rulvar/core/interfaces/FinishContractGoldenReject.md)[] | One reject golden PER contract validator (cycle 74), in validator order, each verified at construction; boundary sharp where a boundary is mechanically safe (the words fixture sits exactly one word outside the bound), the empty text otherwise. | [packages/core/src/orchestrator/output-contract.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L142) |
| <a id="property-hash"></a> `hash` | `readonly` | `string` | sha256 hex over the JCS serialization of the normalized manifest. | [packages/core/src/orchestrator/output-contract.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L117) |
| <a id="property-manifest"></a> `manifest` | `readonly` | [`FinishContractManifest`](/api/@rulvar/core/interfaces/FinishContractManifest.md) | The normalized manifest (defaults applied), deeply frozen. | [packages/core/src/orchestrator/output-contract.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L115) |
| <a id="property-promptlines"></a> `promptLines` | `readonly` | readonly `string`[] | The contract statement for the model, one demand per line. | [packages/core/src/orchestrator/output-contract.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L127) |
| <a id="property-validators"></a> `validators` | `readonly` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | The stock validators enforcing the manifest; names are 'contract-*'. The array and each validator object are frozen at runtime (the type stays mutable for source compatibility), so an in-place pop or a validate() swap throws instead of silently weakening what the hash promises. | [packages/core/src/orchestrator/output-contract.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L125) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContract

# Interface: FinishContract

Defined in: `packages/core/dist/index.d.ts`

What [finishContract](/api/@rulvar/rulvar/functions/finishContract.md) builds from a manifest.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-goldenaccept"></a> `goldenAccept` | `readonly` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) | A generated fixture every contract validator accepts. | `packages/core/dist/index.d.ts` |
| <a id="property-goldenreject"></a> `goldenReject?` | `readonly` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) | A generated fixture at least one contract validator rejects. Absent when the manifest carries only upper bounds, because an empty result is then legitimately acceptable. | `packages/core/dist/index.d.ts` |
| <a id="property-hash"></a> `hash` | `readonly` | `string` | sha256 hex over the JCS serialization of the normalized manifest. | `packages/core/dist/index.d.ts` |
| <a id="property-manifest"></a> `manifest` | `readonly` | [`FinishContractManifest`](/api/@rulvar/rulvar/interfaces/FinishContractManifest.md) | The normalized manifest (defaults applied), frozen. | `packages/core/dist/index.d.ts` |
| <a id="property-promptlines"></a> `promptLines` | `readonly` | readonly `string`[] | The contract statement for the model, one demand per line. | `packages/core/dist/index.d.ts` |
| <a id="property-validators"></a> `validators` | `readonly` | [`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[] | The stock validators enforcing the manifest; names are 'contract-*'. | `packages/core/dist/index.d.ts` |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / AssembledCli

# Interface: AssembledCli

Defined in: [packages/cli/src/engine-assembly.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L36)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argshashsalt"></a> `argsHashSalt?` | `string` | The deployment's argsHash salt (engineOptions.security, RV-217), surfaced so the CLI resume args gate hashes supplied --args the same way the engine hashed the genesis args. | [packages/cli/src/engine-assembly.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L54) |
| <a id="property-currentpricingversion"></a> `currentPricingVersion?` | `string` | The configured price table's version (RV706), surfaced so the invoice and inspect surfaces can name the CURRENT table in a composed provenance instead of leaving the tail's rates anonymous. Absent when the config declares no table. | [packages/cli/src/engine-assembly.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L61) |
| <a id="property-engine"></a> `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) | - | [packages/cli/src/engine-assembly.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L37) |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` | The journal-fold price function (table wins over caps). | [packages/cli/src/engine-assembly.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L41) |
| <a id="property-pricingof"></a> `pricingOf` | (`servedBy`) => [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined` | The resolved pricing row behind priceUsd (table wins over caps), surfaced for the provenance renderers (RV814): the invoice names each priced model's `ratesVerifiedAt` with its age, and the row is where the date lives. | [packages/cli/src/engine-assembly.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L48) |
| <a id="property-store"></a> `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - | [packages/cli/src/engine-assembly.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L38) |
| <a id="property-workflows"></a> `workflows` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | - | [packages/cli/src/engine-assembly.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L39) |

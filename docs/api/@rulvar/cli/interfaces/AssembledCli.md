[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / AssembledCli

# Interface: AssembledCli

Defined in: [packages/cli/src/engine-assembly.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L35)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) | - | [packages/cli/src/engine-assembly.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L36) |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` | The journal-fold price function (table wins over caps). | [packages/cli/src/engine-assembly.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L40) |
| <a id="property-store"></a> `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - | [packages/cli/src/engine-assembly.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L37) |
| <a id="property-workflows"></a> `workflows` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | - | [packages/cli/src/engine-assembly.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L38) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CliConfig

# Interface: CliConfig

Defined in: [packages/cli/src/config.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L40)

The shape both the config module and a workflow module may export.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engineoptions"></a> `engineOptions?` | `Partial`\&lt;[`CreateEngineOptions`](/api/@rulvar/rulvar/interfaces/CreateEngineOptions.md)\&gt; | - | [packages/cli/src/config.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L41) |
| <a id="property-kbsweep"></a> `kbSweep?` | [`KbSweepCliConfig`](/api/@rulvar/cli/interfaces/KbSweepCliConfig.md) | rulvar kb sweep configuration (M11-T05). | [packages/cli/src/config.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L46) |
| <a id="property-preflight"></a> `preflight?` | [`PreflightDeclaration`](/api/@rulvar/cli/type-aliases/PreflightDeclaration.md) | rulvar preflight declaration (P2.2). | [packages/cli/src/config.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L44) |
| <a id="property-workflows"></a> `workflows?` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | - | [packages/cli/src/config.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L42) |

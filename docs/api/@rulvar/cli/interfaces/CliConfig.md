[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CliConfig

# Interface: CliConfig

Defined in: [packages/cli/src/config.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L28)

The shape both the config module and a workflow module may export.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engineoptions"></a> `engineOptions?` | `Partial`\&lt;[`CreateEngineOptions`](/api/@rulvar/rulvar/interfaces/CreateEngineOptions.md)\&gt; | - | [packages/cli/src/config.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L29) |
| <a id="property-kbsweep"></a> `kbSweep?` | `KbSweepCliConfig` | rulvar kb sweep configuration (M11-T05). | [packages/cli/src/config.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L32) |
| <a id="property-workflows"></a> `workflows?` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | - | [packages/cli/src/config.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L30) |

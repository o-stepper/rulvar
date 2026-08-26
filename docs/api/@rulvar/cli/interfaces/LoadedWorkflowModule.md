[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / LoadedWorkflowModule

# Interface: LoadedWorkflowModule

Defined in: [packages/cli/src/config.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L184)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | The module's declared configuration identity (RV4602). | [packages/cli/src/config.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L190) |
| <a id="property-engineoptions"></a> `engineOptions?` | `Partial`\&lt;[`CreateEngineOptions`](/api/@rulvar/rulvar/interfaces/CreateEngineOptions.md)\&gt; | - | [packages/cli/src/config.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L186) |
| <a id="property-preflight"></a> `preflight?` | [`PreflightDeclaration`](/api/@rulvar/cli/type-aliases/PreflightDeclaration.md) | - | [packages/cli/src/config.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L188) |
| <a id="property-workflow"></a> `workflow?` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`never`, `unknown`\&gt; | - | [packages/cli/src/config.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L185) |
| <a id="property-workflows"></a> `workflows?` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | - | [packages/cli/src/config.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L187) |

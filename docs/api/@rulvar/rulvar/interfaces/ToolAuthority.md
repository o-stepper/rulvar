[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolAuthority

# Interface: ToolAuthority

Defined in: `packages/core/dist/index.d.ts`

The authority projection of one tool (RV1802): what the tool may DO
and under what gate, beside WHAT the model sees. The contract hash
pins the model-facing tuple; risk, needsApproval, executor, and the
executorSpec digest are the declarations that never enter
toolsetHash by design, yet every one of them changes what the ask
rules and the approval flow will do. Execute bodies stay
deliberately unhashable: `version` remains the lever for behavior
drift under an unchanged contract.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contract"></a> `contract` | `string` | toolContractHash of the model-facing contract tuple. | `packages/core/dist/index.d.ts` |
| <a id="property-executor"></a> `executor` | [`ToolExecutor`](/api/@rulvar/rulvar/type-aliases/ToolExecutor.md) | Where execute runs: 'inprocess' or a registered executor tag. | `packages/core/dist/index.d.ts` |
| <a id="property-executorspec"></a> `executorSpec?` | `string` | sha256 over the JCS-canonical executorSpec, when declared. | `packages/core/dist/index.d.ts` |
| <a id="property-needsapproval"></a> `needsApproval` | `boolean` | The tool's approval gate (default false at build time). | `packages/core/dist/index.d.ts` |
| <a id="property-risk"></a> `risk?` | `string` | Present when the tool declares a risk class. | `packages/core/dist/index.d.ts` |

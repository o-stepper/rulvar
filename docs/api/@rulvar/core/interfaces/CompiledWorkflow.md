[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CompiledWorkflow

# Interface: CompiledWorkflow

Defined in: [packages/core/src/runner/inprocess.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L20)

Source-backed workflow admissible to the worker sandbox; produced by
compileScript (M6). Declared now so the ScriptRunner seam is shaped
once; feeding a closure to the sandbox stays impossible by types.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | [packages/core/src/runner/inprocess.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L24) |
| <a id="property-kind"></a> `kind` | `readonly` | `"compiled-workflow"` | [packages/core/src/runner/inprocess.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L21) |
| <a id="property-name"></a> `name` | `readonly` | `string` | [packages/core/src/runner/inprocess.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L22) |
| <a id="property-source"></a> `source` | `readonly` | `string` | [packages/core/src/runner/inprocess.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L23) |

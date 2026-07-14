[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CompiledWorkflow

# Interface: CompiledWorkflow

Defined in: `packages/core/dist/index.d.ts`

Source-backed workflow admissible to the worker sandbox; produced by
compileScript (M6). Declared now so the ScriptRunner seam is shaped
once; feeding a closure to the sandbox stays impossible by types.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `readonly` | `"compiled-workflow"` | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `readonly` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-source"></a> `source` | `readonly` | `string` | `packages/core/dist/index.d.ts` |

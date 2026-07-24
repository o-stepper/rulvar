[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / IsolatedExecRequest

# Interface: IsolatedExecRequest

Defined in: `packages/core/dist/index.d.ts`

One out-of-process tool dispatch.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The validated arguments, after the permission chain rewrote them. | `packages/core/dist/index.d.ts` |
| <a id="property-ctx"></a> `ctx` | [`IsolatedExecContext`](/api/@rulvar/rulvar/interfaces/IsolatedExecContext.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/rulvar/type-aliases/IsolatedExecutorTag.md) | The declared executor tag ('subprocess' | 'container'). | `packages/core/dist/index.d.ts` |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The tool's `executorSpec`: opaque host data telling THIS provider what to run (for a subprocess adapter, the command and its argv). Never identity; the engine passes it through verbatim. | `packages/core/dist/index.d.ts` |
| <a id="property-tool"></a> `tool` | `string` | The tool contract name. | `packages/core/dist/index.d.ts` |

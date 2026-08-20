[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolatedExecRequest

# Interface: IsolatedExecRequest

Defined in: [packages/core/src/l0/spi/executor.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L56)

One out-of-process tool dispatch.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The validated arguments, after the permission chain rewrote them. | [packages/core/src/l0/spi/executor.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L62) |
| <a id="property-ctx"></a> `ctx` | [`IsolatedExecContext`](/api/@rulvar/core/interfaces/IsolatedExecContext.md) | - | [packages/core/src/l0/spi/executor.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L69) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/core/type-aliases/IsolatedExecutorTag.md) | The declared executor tag ('subprocess' | 'container'). | [packages/core/src/l0/spi/executor.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L58) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The tool's `executorSpec`: opaque host data telling THIS provider what to run (for a subprocess adapter, the command and its argv). Never identity; the engine passes it through verbatim. | [packages/core/src/l0/spi/executor.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L68) |
| <a id="property-tool"></a> `tool` | `string` | The tool contract name. | [packages/core/src/l0/spi/executor.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L60) |

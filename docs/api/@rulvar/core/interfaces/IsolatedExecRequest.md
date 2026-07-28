[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolatedExecRequest

# Interface: IsolatedExecRequest

Defined in: [packages/core/src/l0/spi/executor.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L55)

One out-of-process tool dispatch.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The validated arguments, after the permission chain rewrote them. | [packages/core/src/l0/spi/executor.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L61) |
| <a id="property-ctx"></a> `ctx` | [`IsolatedExecContext`](/api/@rulvar/core/interfaces/IsolatedExecContext.md) | - | [packages/core/src/l0/spi/executor.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L68) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/core/type-aliases/IsolatedExecutorTag.md) | The declared executor tag ('subprocess' | 'container'). | [packages/core/src/l0/spi/executor.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L57) |
| <a id="property-spec"></a> `spec` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The tool's `executorSpec`: opaque host data telling THIS provider what to run (for a subprocess adapter, the command and its argv). Never identity; the engine passes it through verbatim. | [packages/core/src/l0/spi/executor.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L67) |
| <a id="property-tool"></a> `tool` | `string` | The tool contract name. | [packages/core/src/l0/spi/executor.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L59) |

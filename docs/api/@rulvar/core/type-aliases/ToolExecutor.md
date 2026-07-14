[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolExecutor

# Type Alias: ToolExecutor

```ts
type ToolExecutor = "inprocess" | "subprocess" | "container";
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L47)

Where execute runs. A declared capability consumed by dispatch and
policy; only 'inprocess' is enforced in v1, subprocess/container remain
declared capability while the executor design stays an open question.

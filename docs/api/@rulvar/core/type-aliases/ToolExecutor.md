[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolExecutor

# Type Alias: ToolExecutor

```ts
type ToolExecutor = "inprocess" | "subprocess" | "container";
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L49)

Where execute runs. A declared capability consumed by dispatch and
policy; only 'inprocess' is enforced in v1, subprocess/container remain
declared capability until the executor spec closes (docs/08, section
"Executors"; OQ in docs/14).

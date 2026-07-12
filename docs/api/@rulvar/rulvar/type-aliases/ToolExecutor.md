[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolExecutor

# Type Alias: ToolExecutor

```ts
type ToolExecutor = "inprocess" | "subprocess" | "container";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Where execute runs. A declared capability consumed by dispatch and
policy; only 'inprocess' is enforced in v1, subprocess/container remain
declared capability until the executor spec closes (docs/08, section
"Executors"; OQ in docs/14).

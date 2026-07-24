[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolExecutor

# Type Alias: ToolExecutor

```ts
type ToolExecutor = "inprocess" | "subprocess" | "container";
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L51)

Where execute runs. A declared capability consumed by dispatch and
policy. 'inprocess' runs the tool's `execute` closure in the engine
process (full host capabilities, an execution convenience). A
non-inprocess tag routes dispatch through the engine's registered
ToolExecutorProvider (RV-216) instead, so the tool's work runs out of
process under host-owned isolation; the shipped reference adapters live
in `@rulvar/executor`. The tag never enters toolsetHash.

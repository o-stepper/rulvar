[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / escalateTool

# Function: escalateTool()

```ts
function escalateTool(): ToolDef;
```

Defined in: [packages/core/src/runtime/escalation.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L155)

The engine opt-in tool: registered through the
same path as any tool under escalation opt-in of EITHER flavor (the
worker's only authoring channel for a report), never available without
opt-in, and dispatched through the same permission chain. The loop
intercepts accepted calls; execute is unreachable by construction.

## Returns

[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)

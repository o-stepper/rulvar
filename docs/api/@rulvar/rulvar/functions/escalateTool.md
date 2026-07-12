[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / escalateTool

# Function: escalateTool()

```ts
function escalateTool(): ToolDef;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The engine opt-in tool (docs/08, section 6.6): registered through the
same path as any tool under escalation opt-in of EITHER flavor (the
worker's only authoring channel for a report), never available without
opt-in, and dispatched through the same permission chain. The loop
intercepts accepted calls; execute is unreachable by construction.

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)

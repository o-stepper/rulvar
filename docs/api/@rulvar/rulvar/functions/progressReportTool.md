[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / progressReportTool

# Function: progressReportTool()

```ts
function progressReportTool(): ToolDef;
```

Defined in: `packages/core/dist/index.d.ts`

The stock progress-report tool. Stateless and deterministic: the
result echoes the counts, so a verbatim repeated report is a
duplicate result digest to the exploration guards. The value is the
side contract: the engine captures the LAST successful call of this
tool as the structured terminal partial of a 'limit' invocation, so
an agent that reports after every batch never loses its collected
work to a budget expiry.

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)

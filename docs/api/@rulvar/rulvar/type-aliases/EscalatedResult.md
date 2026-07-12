[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalatedResult

# Type Alias: EscalatedResult\&lt;T\&gt;

```ts
type EscalatedResult<T> = AgentResult<T> & {
  escalation: EscalationReport;
  status: "escalated";
};
```

Defined in: `packages/core/dist/index.d.ts`

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/rulvar/interfaces/EscalationReport.md) | `packages/core/dist/index.d.ts` |
| `status` | `"escalated"` | `packages/core/dist/index.d.ts` |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

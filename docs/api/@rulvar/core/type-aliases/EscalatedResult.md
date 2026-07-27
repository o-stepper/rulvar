[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalatedResult

# Type Alias: EscalatedResult\&lt;T\&gt;

```ts
type EscalatedResult<T> = AgentResult<T> & {
  escalation: EscalationReport;
  status: "escalated";
};
```

Defined in: [packages/core/src/runtime/agent-loop.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L258)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L260) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L259) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

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

Defined in: [packages/core/src/runtime/agent-loop.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L246)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L248) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L247) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

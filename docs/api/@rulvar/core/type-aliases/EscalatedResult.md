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

Defined in: [packages/core/src/runtime/agent-loop.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L319)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L321) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L320) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

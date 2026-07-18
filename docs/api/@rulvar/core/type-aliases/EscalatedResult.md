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

Defined in: [packages/core/src/runtime/agent-loop.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L143)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L145) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L144) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

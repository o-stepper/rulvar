[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalatedResult

# Type Alias: EscalatedResult\&lt;T\&gt;

```ts
type EscalatedResult<T> = AgentResult<T> & {
  escalation: EscalationReport;
  status: "escalated";
};
```

Defined in: [packages/core/src/runtime/agent-loop.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L132)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L134) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L133) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

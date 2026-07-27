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

Defined in: [packages/core/src/runtime/agent-loop.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L255)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L257) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L256) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

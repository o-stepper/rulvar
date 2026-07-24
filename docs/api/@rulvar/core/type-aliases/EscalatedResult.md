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

Defined in: [packages/core/src/runtime/agent-loop.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L184)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L186) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L185) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

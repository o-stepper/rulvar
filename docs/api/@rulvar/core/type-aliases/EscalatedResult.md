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

Defined in: [packages/core/src/runtime/agent-loop.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L321)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L323) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L322) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

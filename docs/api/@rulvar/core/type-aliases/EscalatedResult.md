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

Defined in: [packages/core/src/runtime/agent-loop.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L170)

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `escalation` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) | [packages/core/src/runtime/agent-loop.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L172) |
| `status` | `"escalated"` | [packages/core/src/runtime/agent-loop.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L171) |

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

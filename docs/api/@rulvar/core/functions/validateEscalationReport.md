[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateEscalationReport

# Function: validateEscalationReport()

```ts
function validateEscalationReport(report): Promise<Issue[]>;
```

Defined in: [packages/core/src/runtime/escalation.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L174)

Validates the runtime-completed report BEFORE append; returns issues.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `report` | [`EscalationReport`](/api/@rulvar/core/interfaces/EscalationReport.md) |

## Returns

`Promise`\&lt;[`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[]\&gt;

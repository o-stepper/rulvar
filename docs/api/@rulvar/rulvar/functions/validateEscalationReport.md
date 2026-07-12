[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateEscalationReport

# Function: validateEscalationReport()

```ts
function validateEscalationReport(report): Promise<Issue[]>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Validates the runtime-completed report BEFORE append; returns issues.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `report` | [`EscalationReport`](/api/@rulvar/rulvar/interfaces/EscalationReport.md) |

## Returns

`Promise`\&lt;[`Issue`](/api/@rulvar/rulvar/type-aliases/Issue.md)[]\&gt;

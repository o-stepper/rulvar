[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateEscalationLimits

# Function: validateEscalationLimits()

```ts
function validateEscalationLimits(raw?): EscalationLimits;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Validates a lineage-limits config record. The pre-rename knob name is
rejected with a migration hint (XF-10): silently honoring it would
change semantics (per logical task, not per node).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw?` | \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)\&gt; |

## Returns

[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)

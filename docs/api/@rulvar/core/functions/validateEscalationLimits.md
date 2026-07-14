[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateEscalationLimits

# Function: validateEscalationLimits()

```ts
function validateEscalationLimits(raw?): EscalationLimits;
```

Defined in: [packages/core/src/journal/lineage.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L123)

Validates a lineage-limits config record. The pre-rename knob name is
rejected with a migration hint (XF-10): silently honoring it would
change semantics (per logical task, not per node).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw?` | \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)\&gt; |

## Returns

[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)

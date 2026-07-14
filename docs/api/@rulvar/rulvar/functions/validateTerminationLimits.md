[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateTerminationLimits

# Function: validateTerminationLimits()

```ts
function validateTerminationLimits(raw): TerminationLimits;
```

Defined in: `packages/core/dist/index.d.ts`

Validates a raw limits record into the frozen vector. The pre-rename
escalation knob is rejected with a migration hint (XF-10); counters
must be non-negative integers; kMax at least 1.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md)\&gt; |

## Returns

[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md)

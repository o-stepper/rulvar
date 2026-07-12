[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / emptyDigestBlocks

# Function: emptyDigestBlocks()

```ts
function emptyDigestBlocks(): Pick<WakeDigest, "planHash" | "termination" | "budget" | "reuse">;
```

Defined in: [packages/core/src/orchestrator/wake.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L138)

The all-zero blocks of runs without the PlanRunner extension.

## Returns

`Pick`\&lt;[`WakeDigest`](/api/@rulvar/core/interfaces/WakeDigest.md), `"planHash"` \| `"termination"` \| `"budget"` \| `"reuse"`\&gt;

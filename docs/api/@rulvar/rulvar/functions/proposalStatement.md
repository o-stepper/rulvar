[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / proposalStatement

# Function: proposalStatement()

```ts
function proposalStatement(proposal): string;
```

Defined in: `packages/core/dist/index.d.ts`

The typed statement template for a proposal-born claim (phase 3):
assembled over the closed enum vocabulary ONLY, so tool-output text
is unquotable into persistence, and model-free, because a claim
statement renders into the knowledge card's notes layer, which never
leaks model names to the orchestrator.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `proposal` | `Pick`\&lt;[`KbProposal`](/api/@rulvar/rulvar/interfaces/KbProposal.md), `"taskClass"` \| `"polarity"` \| `"trigger"`\&gt; |

## Returns

`string`

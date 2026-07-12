[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / proposalStatement

# Function: proposalStatement()

```ts
function proposalStatement(proposal): string;
```

Defined in: [packages/core/src/knowledge/claims.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L31)

The typed statement template for a proposal-born claim (phase 3):
assembled over the closed enum vocabulary ONLY, so tool-output text
is unquotable into persistence, and model-free, because a claim
statement renders into the knowledge card's notes layer, which never
leaks model names to the orchestrator.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `proposal` | `Pick`\&lt;[`KbProposal`](/api/@rulvar/core/interfaces/KbProposal.md), `"taskClass"` \| `"polarity"` \| `"trigger"`\&gt; |

## Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / agentTypeBucket

# Function: agentTypeBucket()

```ts
function agentTypeBucket(
   agentType, 
   role, 
   label): string;
```

Defined in: `packages/core/dist/index.d.ts`

The byAgentType bucket of one attributed slice (RV4206, the RV3905
vacuum-fill precedent carried to the agent-type table). A declared
agentType always wins, verbatim. The vacuum, an absent or empty
agentType, is FILLED from facts the journal already records instead
of stamping new bytes: role 'orchestrate' names the bucket
'orchestrator' (the coordination loop and the forced-finish wake),
and role 'synthesize' names it by the dispatch label through the
ONE [synthesizeSpanClassOf](/api/@rulvar/rulvar/functions/synthesizeSpanClassOf.md) classifier: 'synthesizer' for
compositions and notes, 'claim-judge' and 'citation-judge' for the
two judges, with an unknown label keeping the honest 'unknown'.
Because the derivation reads only recorded facts, the live report,
the journal fold, and every ARCHIVED journal report the same named
buckets: the sixth comparison run's report read byAgentType 100%
'unknown' over a run whose every dispatch had a nameable stage, and
that same journal now folds to named rows retroactively. Both
accumulation sites and the journal fold call this one function, the
RV3302 no-drift doctrine.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `agentType` | `string` \| `undefined` |
| `role` | `string` \| `undefined` |
| `label` | `string` \| `undefined` |

## Returns

`string`

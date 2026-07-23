[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / researchAgentProfile

# Function: researchAgentProfile()

```ts
function researchAgentProfile(options): ResearchAgentProfileResult;
```

Defined in: `packages/core/dist/index.d.ts`

The batteries-included research child: the confined
[repositoryResearchToolset](/api/@rulvar/rulvar/functions/repositoryResearchToolset.md) over `root`, the stock
report_progress tool, and [RESEARCH\_PROFILE\_LIMITS](/api/@rulvar/rulvar/variables/RESEARCH_PROFILE_LIMITS.md) as the stop
conditions. A child spawned from this profile that runs out of budget
settles 'limit' WITH its last progress report as the structured
partial, and the recorded evidence stays readable host-side through
`evidence()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md) |

## Returns

[`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md)

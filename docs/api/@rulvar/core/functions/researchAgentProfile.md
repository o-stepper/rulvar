[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / researchAgentProfile

# Function: researchAgentProfile()

```ts
function researchAgentProfile(options): ResearchAgentProfileResult;
```

Defined in: [packages/core/src/engine/profile-templates.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L120)

The batteries-included research child: the confined
[repositoryResearchToolset](/api/@rulvar/core/functions/repositoryResearchToolset.md) over `root`, the stock
report_progress tool, and [RESEARCH\_PROFILE\_LIMITS](/api/@rulvar/core/variables/RESEARCH_PROFILE_LIMITS.md) as the stop
conditions. A child spawned from this profile that runs out of budget
settles 'limit' WITH its last progress report as the structured
partial, and the recorded evidence stays readable host-side through
`evidence()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ResearchAgentProfileOptions`](/api/@rulvar/core/interfaces/ResearchAgentProfileOptions.md) |

## Returns

[`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md)

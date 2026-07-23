[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reviewAgentProfile

# Function: reviewAgentProfile()

```ts
function reviewAgentProfile(options?): AgentProfile;
```

Defined in: `packages/core/dist/index.d.ts`

The review child template: the caller's task tools plus the progress
contract, with [REVIEW\_PROFILE\_LIMITS](/api/@rulvar/rulvar/variables/REVIEW_PROFILE_LIMITS.md) as the stop conditions
(a tighter turn budget and the no-new-evidence guard: a reviewer
circling over the same pages should stop, not spin).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`AgentProfileTemplateOptions`](/api/@rulvar/rulvar/interfaces/AgentProfileTemplateOptions.md) |

## Returns

[`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)

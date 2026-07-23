[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reviewAgentProfile

# Function: reviewAgentProfile()

```ts
function reviewAgentProfile(options?): AgentProfile;
```

Defined in: [packages/core/src/engine/profile-templates.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L165)

The review child template: the caller's task tools plus the progress
contract, with [REVIEW\_PROFILE\_LIMITS](/api/@rulvar/core/variables/REVIEW_PROFILE_LIMITS.md) as the stop conditions
(a tighter turn budget and the no-new-evidence guard: a reviewer
circling over the same pages should stop, not spin).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AgentProfileTemplateOptions`](/api/@rulvar/core/interfaces/AgentProfileTemplateOptions.md) |

## Returns

[`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)

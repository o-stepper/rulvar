[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / implementationAgentProfile

# Function: implementationAgentProfile()

```ts
function implementationAgentProfile(options?): AgentProfile;
```

Defined in: [packages/core/src/engine/profile-templates.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L145)

The implementation child template: the caller's task tools plus the
progress contract, with [IMPLEMENTATION\_PROFILE\_LIMITS](/api/@rulvar/core/variables/IMPLEMENTATION_PROFILE_LIMITS.md) as the
stop conditions (a no-progress detector instead of the research
no-new-evidence guard: implementation legitimately re-reads state).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AgentProfileTemplateOptions`](/api/@rulvar/core/interfaces/AgentProfileTemplateOptions.md) |

## Returns

[`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)

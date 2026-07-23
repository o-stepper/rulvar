[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / implementationAgentProfile

# Function: implementationAgentProfile()

```ts
function implementationAgentProfile(options?): AgentProfile;
```

Defined in: `packages/core/dist/index.d.ts`

The implementation child template: the caller's task tools plus the
progress contract, with [IMPLEMENTATION\_PROFILE\_LIMITS](/api/@rulvar/rulvar/variables/IMPLEMENTATION_PROFILE_LIMITS.md) as the
stop conditions (a no-progress detector instead of the research
no-new-evidence guard: implementation legitimately re-reads state).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`AgentProfileTemplateOptions`](/api/@rulvar/rulvar/interfaces/AgentProfileTemplateOptions.md) |

## Returns

[`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)

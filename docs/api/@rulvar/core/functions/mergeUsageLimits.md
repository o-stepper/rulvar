[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / mergeUsageLimits

# Function: mergeUsageLimits()

```ts
function mergeUsageLimits(
   call?, 
   profile?, 
   engine?): EffectiveUsageLimits;
```

Defined in: [packages/core/src/runtime/usage-limits.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L47)

Limits merge per spawn: AgentOpts.limits over profile limits over engine
defaults.limits (docs/06, section "UsageLimits").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `call?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) |
| `profile?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) |
| `engine?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) |

## Returns

[`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md)

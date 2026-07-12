[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / mergeUsageLimits

# Function: mergeUsageLimits()

```ts
function mergeUsageLimits(
   call?, 
   profile?, 
   engine?): EffectiveUsageLimits;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Limits merge per spawn: AgentOpts.limits over profile limits over engine
defaults.limits (docs/06, section "UsageLimits").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `call?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) |
| `profile?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) |
| `engine?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) |

## Returns

[`EffectiveUsageLimits`](/api/@rulvar/rulvar/interfaces/EffectiveUsageLimits.md)

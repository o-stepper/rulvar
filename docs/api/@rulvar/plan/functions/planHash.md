[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / planHash

# Function: planHash()

```ts
function planHash(plan, deriver?): string;
```

Defined in: [packages/plan/src/plan-hash.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-hash.ts#L65)

planHash under one deriver profile (default: the current hashVersion 2
profile). Replay recomputes each entry's planHashAfter with the
predicate of that entry's OWN hashVersion, so the
deriver is a parameter, not an ambient.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) | `undefined` |
| `deriver` | [`KeyDeriver`](/api/@rulvar/rulvar/interfaces/KeyDeriver.md) | `deriverV2` |

## Returns

`string`

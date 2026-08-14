[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / attributionBucket

# Function: attributionBucket()

```ts
function attributionBucket(value): string;
```

Defined in: `packages/core/dist/index.d.ts`

The named fallback bucket of the attribution folds (RV3604): an
absent phase, an EMPTY phase and an empty agentType all fold under
'unknown' instead of minting a '' key. The third comparison run's
report read `byPhase {"": 5.58}` for the whole run and a '' bucket
beside the named agent types: the empty string passed the `??`
fallback, and a '' key is unaddressable in every downstream table.
Both builders and both live accumulation sites apply this one rule,
so the live report and the journal fold cannot disagree on the key.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `string` \| `undefined` |

## Returns

`string`

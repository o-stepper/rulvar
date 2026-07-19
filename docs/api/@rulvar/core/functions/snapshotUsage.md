[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / snapshotUsage

# Function: snapshotUsage()

```ts
function snapshotUsage(usage): Usage;
```

Defined in: [packages/core/src/l0/usage.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/usage.ts#L90)

One field read per property, returning a detached plain copy. Both
accounting boundaries validate and consume THIS snapshot, never the
adapter-owned object, so a hostile accessor cannot answer the
validator with valid counts and the accumulator with garbage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/core/type-aliases/Usage.md)

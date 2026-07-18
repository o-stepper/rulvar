[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / snapshotUsage

# Function: snapshotUsage()

```ts
function snapshotUsage(usage): Usage;
```

Defined in: `packages/core/dist/index.d.ts`

One field read per property, returning a detached plain copy. Both
accounting boundaries validate and consume THIS snapshot, never the
adapter-owned object, so a hostile accessor cannot answer the
validator with valid counts and the accumulator with garbage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)

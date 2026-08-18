[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / retryWireMultiplier

# Function: retryWireMultiplier()

```ts
function retryWireMultiplier(baseWires, retries): number;
```

Defined in: `packages/core/dist/index.d.ts`

The retry share of a wire plan (RV4005): r retries over a base of B
wires re-dispatch r of the B, so totals scale by `1 + r/B`. The
fifth comparison run's answer multiplied by `1 + r`, reading every
retry as a whole extra plan.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `baseWires` | `number` |
| `retries` | `number` |

## Returns

`number`

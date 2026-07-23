[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / hashRunOutput

# Function: hashRunOutput()

```ts
function hashRunOutput(value): string | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

sha256 hex over the JCS canonical serialization of a run's result
value: the digest the engine records as `outputHash` on the journaled
run-settle decision when the settling segment computed a value, and
the value `rulvar replay --compare-output-hash` compares a replayed
result against (RV-209). Best-effort by design: returns undefined for
undefined values and for values JCS cannot serialize (functions,
cycles, non-finite numbers), so an unhashable result records no
baseline rather than failing the settle. Like `hashRunArgs`, the
digest is deterministic and unsalted: treat it as sensitive-derived
metadata for low-entropy results.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

## Returns

`string` \| `undefined`

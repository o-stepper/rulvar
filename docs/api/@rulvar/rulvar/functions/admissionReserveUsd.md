[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / admissionReserveUsd

# Function: admissionReserveUsd()

```ts
function admissionReserveUsd(options): number;
```

Defined in: `packages/core/dist/index.d.ts`

The admission reserve for a spawn: opts.estCost, else profile.estCost,
else price(countTokens(input) + one turn's worth of output), else the
engine flat default. The output term is caps.maxOutputTokens clamped to
limits.maxOutputTokensPerTurn when the spawn carries one, so a host can
bound reserves without hand-written estimates. The priced path uses the
SAME price function as settlement (priceUsdOf), so long-context tiers
apply to estimates too.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `caps?`: [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md); `estCost?`: `number`; `flatReserveUsd?`: `number`; `inputTokens?`: `number`; `maxOutputTokensPerTurn?`: `number`; `profileEstCost?`: `number`; \} |
| `options.caps?` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) |
| `options.estCost?` | `number` |
| `options.flatReserveUsd?` | `number` |
| `options.inputTokens?` | `number` |
| `options.maxOutputTokensPerTurn?` | `number` |
| `options.profileEstCost?` | `number` |

## Returns

`number`

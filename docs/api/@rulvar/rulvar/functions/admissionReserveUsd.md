[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / admissionReserveUsd

# Function: admissionReserveUsd()

```ts
function admissionReserveUsd(options): number;
```

Defined in: `packages/core/dist/index.d.ts`

The admission reserve for a spawn: opts.estCost, else profile.estCost, else
price(countTokens(input) + caps.maxOutputTokens), else the engine flat
default.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `caps?`: [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md); `estCost?`: `number`; `flatReserveUsd?`: `number`; `inputTokens?`: `number`; `profileEstCost?`: `number`; \} |
| `options.caps?` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) |
| `options.estCost?` | `number` |
| `options.flatReserveUsd?` | `number` |
| `options.inputTokens?` | `number` |
| `options.profileEstCost?` | `number` |

## Returns

`number`

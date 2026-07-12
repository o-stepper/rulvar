[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / admissionReserveUsd

# Function: admissionReserveUsd()

```ts
function admissionReserveUsd(options): number;
```

Defined in: [packages/core/src/engine/budget.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L46)

The admission reserve for a spawn (docs/06, section "Layer 1: admission
before spawn"): opts.estCost, else profile.estCost, else
price(countTokens(input) + caps.maxOutputTokens), else the engine flat
default.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `caps?`: [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md); `estCost?`: `number`; `flatReserveUsd?`: `number`; `inputTokens?`: `number`; `profileEstCost?`: `number`; \} |
| `options.caps?` | [`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md) |
| `options.estCost?` | `number` |
| `options.flatReserveUsd?` | `number` |
| `options.inputTokens?` | `number` |
| `options.profileEstCost?` | `number` |

## Returns

`number`

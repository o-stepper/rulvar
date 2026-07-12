[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ladderRungChoice

# Function: ladderRungChoice()

```ts
function ladderRungChoice(ladder, index): ModelChoice;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The concrete ModelChoice of one rung attempt: each attempt is an
ordinary agent scope whose CanonicalModelSpec is that rung's
`{ kind: 'model' }` form (docs/04, section 8.2).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ladder` | [`CanonicalLadderSpec`](/api/@rulvar/rulvar/interfaces/CanonicalLadderSpec.md) |
| `index` | `number` |

## Returns

[`ModelChoice`](/api/@rulvar/rulvar/interfaces/ModelChoice.md)

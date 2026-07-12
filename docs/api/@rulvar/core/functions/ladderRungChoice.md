[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ladderRungChoice

# Function: ladderRungChoice()

```ts
function ladderRungChoice(ladder, index): ModelChoice;
```

Defined in: [packages/core/src/model/router.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L439)

The concrete ModelChoice of one rung attempt: each attempt is an
ordinary agent scope whose CanonicalModelSpec is that rung's
`{ kind: 'model' }` form (docs/04, section 8.2).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ladder` | [`CanonicalLadderSpec`](/api/@rulvar/core/interfaces/CanonicalLadderSpec.md) |
| `index` | `number` |

## Returns

[`ModelChoice`](/api/@rulvar/core/interfaces/ModelChoice.md)

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / evalMeasuredClaim

# Function: evalMeasuredClaim()

```ts
function evalMeasuredClaim(input, committerId): ModelClaim;
```

Defined in: [packages/evals/src/committer.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L69)

One measured claim; claimExpiry applies the TTL from the decay table.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`MeasuredClaimInput`](/api/@rulvar/evals/interfaces/MeasuredClaimInput.md) |
| `committerId` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)

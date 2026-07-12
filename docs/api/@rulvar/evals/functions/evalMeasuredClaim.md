[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / evalMeasuredClaim

# Function: evalMeasuredClaim()

```ts
function evalMeasuredClaim(input, committerId): ModelClaim;
```

Defined in: [packages/evals/src/committer.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L52)

One measured claim, TTL applied per the docs/05 decay table.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`MeasuredClaimInput`](/api/@rulvar/evals/interfaces/MeasuredClaimInput.md) |
| `committerId` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)

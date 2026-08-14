[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / isClaimJudgeLabel

# Function: isClaimJudgeLabel()

```ts
function isClaimJudgeLabel(label): boolean;
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:443](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L443)

Whether a synthesize span's label names a claim-consistency judge
invocation: the exact [CLAIM\_JUDGE\_LABEL](/api/@rulvar/core/variables/CLAIM_JUDGE_LABEL.md), or a suffixed
variant of it (the final pass dispatches under
`claim-consistency-judge-final` since RV2509 so the two passes of
`stage: 'both'` stay separable). BOTH reducers must classify through
this one predicate (RV3302): the live fold compared the label for
exact equality while the journal fold accepted the suffix, and the
2026-08-12 comparison run reported semanticJudgeMs 0 with the whole
272923 ms window read as final composition on the live surface
while the journal fold correctly split 224864 against 48059.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` \| `undefined` |

## Returns

`boolean`

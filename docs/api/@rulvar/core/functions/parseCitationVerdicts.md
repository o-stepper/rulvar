[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / parseCitationVerdicts

# Function: parseCitationVerdicts()

```ts
function parseCitationVerdicts(output, rowIndexes): 
  | Map<number, {
  reason: string;
  verdict: "partial" | "supported" | "unsupported";
}>
  | undefined;
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:791](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L791)

Parses the judge output strictly: one verdict per judged row, no
duplicates, no rows beyond the judged set, verdicts from the closed
vocabulary. Anything else returns undefined and the caller treats
the invocation as a failed judge (nothing was judged; partial
verdicts over a partial parse would claim more than the judge
said). The row set is a BIJECTION with the sample (RV4402): a
fabricated extra row is a parse failure, never surplus information,
because a judge inventing rows is a judge whose output cannot be
trusted about the rows it was asked.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `output` | `unknown` |
| `rowIndexes` | readonly `number`[] |

## Returns

  \| `Map`\<`number`, \{
  `reason`: `string`;
  `verdict`: `"partial"` \| `"supported"` \| `"unsupported"`;
\}\>
  \| `undefined`

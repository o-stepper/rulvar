[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / parseCitationVerdicts

# Function: parseCitationVerdicts()

```ts
function parseCitationVerdicts(output, rowIndexes): 
  | Map<number, {
  reason: string;
  verdict: "partial" | "supported" | "unsupported";
}>
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Parses the judge output strictly: one verdict per judged row, no
duplicates, verdicts from the closed vocabulary. Anything else returns
undefined and the caller treats the invocation as a failed judge
(nothing was judged; partial verdicts over a partial parse would
claim more than the judge said).

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

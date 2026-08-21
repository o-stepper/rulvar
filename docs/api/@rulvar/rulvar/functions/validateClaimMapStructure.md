[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateClaimMapStructure

# Function: validateClaimMapStructure()

```ts
function validateClaimMapStructure(
   rows, 
   documentText, 
   pattern?): 
  | {
  ok: true;
}
  | {
  ok: false;
  reasons: string[];
};
```

Defined in: `packages/core/dist/index.d.ts`

The structural verdict over a schema-valid claim map (RV4305):
deterministic, relational, and HONEST about its own limits. Every
reason names the offending rows or anchors so a rejected finish is
repairable from the feedback alone. This function never judges
whether a grade is true; that is the claim judge's question.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ClaimMapRow`](/api/@rulvar/rulvar/interfaces/ClaimMapRow.md)[] |
| `documentText` | `string` |
| `pattern?` | `string` |

## Returns

  \| \{
  `ok`: `true`;
\}
  \| \{
  `ok`: `false`;
  `reasons`: `string`[];
\}

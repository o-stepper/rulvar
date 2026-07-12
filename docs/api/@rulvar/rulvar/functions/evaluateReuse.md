[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / evaluateReuse

# Function: evaluateReuse()

```ts
function evaluateReuse(
   index, 
   spawnKey, 
   config?): 
  | {
  kind: "none";
}
  | {
  kind: "reject_osc_guard";
  oscillationCount: number;
}
  | {
  donor: DonorCandidate;
  kind: "reuse_full";
}
  | {
  donor: DonorCandidate;
  kind: "admit_graft";
}
  | {
  kind: "fresh";
  note: DedupNote;
};
```

Defined in: `packages/core/dist/index.d.ts`

The four-outcome verdict evaluation on a SpawnKey match, computed
once live at the fold head and embedded into the
deciding entry; replay never re-evaluates.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `index` | [`DedupIndex`](/api/@rulvar/rulvar/classes/DedupIndex.md) |
| `spawnKey` | `string` |
| `config?` | [`ReuseConfig`](/api/@rulvar/rulvar/interfaces/ReuseConfig.md) |

## Returns

  \| \{
  `kind`: `"none"`;
\}
  \| \{
  `kind`: `"reject_osc_guard"`;
  `oscillationCount`: `number`;
\}
  \| \{
  `donor`: [`DonorCandidate`](/api/@rulvar/rulvar/interfaces/DonorCandidate.md);
  `kind`: `"reuse_full"`;
\}
  \| \{
  `donor`: [`DonorCandidate`](/api/@rulvar/rulvar/interfaces/DonorCandidate.md);
  `kind`: `"admit_graft"`;
\}
  \| \{
  `kind`: `"fresh"`;
  `note`: [`DedupNote`](/api/@rulvar/rulvar/interfaces/DedupNote.md);
\}

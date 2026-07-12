[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / evaluateReuse

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

Defined in: [packages/core/src/journal/reuse.ts:382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L382)

The four-outcome verdict evaluation on a SpawnKey match (docs/03,
9.4), computed once live at the fold head and embedded into the
deciding entry; replay never re-evaluates.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `index` | [`DedupIndex`](/api/@rulvar/core/classes/DedupIndex.md) |
| `spawnKey` | `string` |
| `config?` | [`ReuseConfig`](/api/@rulvar/core/interfaces/ReuseConfig.md) |

## Returns

  \| \{
  `kind`: `"none"`;
\}
  \| \{
  `kind`: `"reject_osc_guard"`;
  `oscillationCount`: `number`;
\}
  \| \{
  `donor`: [`DonorCandidate`](/api/@rulvar/core/interfaces/DonorCandidate.md);
  `kind`: `"reuse_full"`;
\}
  \| \{
  `donor`: [`DonorCandidate`](/api/@rulvar/core/interfaces/DonorCandidate.md);
  `kind`: `"admit_graft"`;
\}
  \| \{
  `kind`: `"fresh"`;
  `note`: [`DedupNote`](/api/@rulvar/core/interfaces/DedupNote.md);
\}

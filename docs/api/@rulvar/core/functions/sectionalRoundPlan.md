[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sectionalRoundPlan

# Function: sectionalRoundPlan()

```ts
function sectionalRoundPlan(document, excerpts): 
  | SectionalRoundPlan
  | undefined;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:399](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L399)

Plans the sectional claim repair round (RV3803): which H2 sections
of the accepted pre-repair document own the judged findings. The
third comparison run's round regenerated the WHOLE 43k character
document to consume findings that lived in a handful of sentences,
and the tail after fan-in was 80.1 percent of the run's wall. Each
finding's `draftExcerpt` (whitespace collapsed by the pairing fold)
is located in the document through a collapse-aware scan, and its
owning section is the nearest H2 line above it. Fail closed to the
FULL regeneration (undefined, the historical round byte for byte)
whenever the plan cannot be exact: no excerpts, a document without
H2 headings, duplicated markers (the splice grammar needs unique
lines), or any excerpt the scan cannot locate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `document` | `string` |
| `excerpts` | readonly `string`[] |

## Returns

  \| [`SectionalRoundPlan`](/api/@rulvar/core/interfaces/SectionalRoundPlan.md)
  \| `undefined`

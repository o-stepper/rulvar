[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SYNTHESIS\_NOTE\_LABEL

# Variable: SYNTHESIS\_NOTE\_LABEL

```ts
const SYNTHESIS_NOTE_LABEL: "synthesis-note" = 'synthesis-note';
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:433](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L433)

The label an incremental synthesis note dispatches under (RV2901).
Notes ride role 'synthesize' and are composition-side work, so both
reducers count them toward the composition half of the split; the
label exists so a journal reader can tell WHICH composition spans
were notes without guessing from their size.

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FINISH\_LESSON\_CAP\_CHARS

# Variable: FINISH\_LESSON\_CAP\_CHARS

```ts
const FINISH_LESSON_CAP_CHARS: 2000 = 2e3;
```

Defined in: `packages/core/dist/index.d.ts`

Character cap of the HOST VALIDATION LESSONS prompt block (RV3603):
the bounded repair round's prompt folds the run's journaled finish
validation failures so the round does not relearn a lesson the run
already bought, and a pathological history must not flood the
composition context. Rows keep journal order; the tail is dropped
and the block names how many rows it dropped.

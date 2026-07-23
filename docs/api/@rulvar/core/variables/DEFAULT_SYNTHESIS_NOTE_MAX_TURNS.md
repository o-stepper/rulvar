[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_SYNTHESIS\_NOTE\_MAX\_TURNS

# Variable: DEFAULT\_SYNTHESIS\_NOTE\_MAX\_TURNS

```ts
const DEFAULT_SYNTHESIS_NOTE_MAX_TURNS: 2 = 2;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L176)

Default maxTurns of ONE incremental synthesis note (RV-211 remainder):
a note summarizes a single settled child into a bounded finish call,
so it needs less headroom than the full synthesis invocation.

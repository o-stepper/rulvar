[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DEFAULT\_SYNTHESIS\_NOTE\_MAX\_TURNS

# Variable: DEFAULT\_SYNTHESIS\_NOTE\_MAX\_TURNS

```ts
const DEFAULT_SYNTHESIS_NOTE_MAX_TURNS: 2 = 2;
```

Defined in: `packages/core/dist/index.d.ts`

Default maxTurns of ONE incremental synthesis note (RV-211 remainder):
a note summarizes a single settled child into a bounded finish call,
so it needs less headroom than the full synthesis invocation.

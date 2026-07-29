[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MAX\_TIMER\_DELAY\_MS

# Variable: MAX\_TIMER\_DELAY\_MS

```ts
const MAX_TIMER_DELAY_MS: 2147483647 = 2147483647;
```

Defined in: `packages/core/dist/index.d.ts`

The Node timer ceiling: setTimeout clamps any longer delay to 1 ms, so
a naive far-future timer fires immediately (v1.34.0 review P2-2).
Relative timer options are validated against this bound; absolute
deadlines use the sliced timer in long-timer.ts instead.

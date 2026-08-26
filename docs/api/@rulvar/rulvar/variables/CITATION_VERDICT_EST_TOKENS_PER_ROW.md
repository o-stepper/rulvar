[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CITATION\_VERDICT\_EST\_TOKENS\_PER\_ROW

# Variable: CITATION\_VERDICT\_EST\_TOKENS\_PER\_ROW

```ts
const CITATION_VERDICT_EST_TOKENS_PER_ROW: 70 = 70;
```

Defined in: `packages/core/dist/index.d.ts`

The verdict bijection's output floor per judged row (RV4706): one
{ row, verdict, reason } object with a one-sentence reason. The
census rejudges of the seventh and eighth comparison experiments
(145 and 215 rows) both overflowed a 9000-token judge cap and fit
32000, which brackets the per-row envelope this floor prices.

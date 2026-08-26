[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CITATION\_UNIT\_JUDGE\_EXTENSION\_FACTOR

# Variable: CITATION\_UNIT\_JUDGE\_EXTENSION\_FACTOR

```ts
const CITATION_UNIT_JUDGE_EXTENSION_FACTOR: 2 = 2;
```

Defined in: `packages/core/dist/index.d.ts`

The judge-side extension factor over the default unit caps (RV4707,
the seventh candidate's census rejudge): rows 81 and 105 of that
census carried honest support 3..7 lines past the 20-line clip, and
the judge honestly ruled unsupported over the incomplete window. A
row whose DEFAULT unit truncates is re-resolved for the judge at
this factor times the line and char bounds, still bounded; the
linter side keeps the default unit with its own grace tail.

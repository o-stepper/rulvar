[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MAX\_CITATION\_UNIT\_EXCERPT\_LINES

# Variable: MAX\_CITATION\_UNIT\_EXCERPT\_LINES

```ts
const MAX_CITATION_UNIT_EXCERPT_LINES: 20 = 20;
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L176)

Resolver v2's unit bounds (RV4401). A unit excerpt exists to carry
the WHOLE bounded logical unit, so its caps must fit the package's
typical docstrings and guide sections: the seventh comparison
experiment's one section false negative was a section cut mid-unit
by the v1-sized char cap, with the supporting line right past the
cut. Resolver v1 keeps its own smaller bounds byte for byte.

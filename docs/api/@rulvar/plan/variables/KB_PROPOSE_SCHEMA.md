[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / KB\_PROPOSE\_SCHEMA

# Variable: KB\_PROPOSE\_SCHEMA

```ts
const KB_PROPOSE_SCHEMA: SchemaSpec;
```

Defined in: [packages/plan/src/tools.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L276)

The normative kb_propose schema (phase 3). The subject is
tier-relative: the orchestrator never sees model names, so the
handler resolves the rung index against the declared ladder of the
referenced lineage into the concrete KbProposal subject.

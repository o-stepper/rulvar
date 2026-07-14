[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ESCALATION\_REQUEST\_SCHEMA

# Variable: ESCALATION\_REQUEST\_SCHEMA

```ts
const ESCALATION_REQUEST_SCHEMA: JsonSchema;
```

Defined in: `packages/core/dist/index.d.ts`

The escalate tool's exact request schema. costToDate and salvage
MUST NOT appear here: additionalProperties false rejects model-authored
values for them at argument validation.

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ESCALATION\_REQUEST\_SCHEMA

# Variable: ESCALATION\_REQUEST\_SCHEMA

```ts
const ESCALATION_REQUEST_SCHEMA: JsonSchema;
```

Defined in: [packages/core/src/runtime/escalation.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L85)

The escalate tool's exact request schema. costToDate and salvage
MUST NOT appear here: additionalProperties false rejects model-authored
values for them at argument validation.

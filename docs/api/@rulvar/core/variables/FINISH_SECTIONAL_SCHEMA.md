[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FINISH\_SECTIONAL\_SCHEMA

# Variable: FINISH\_SECTIONAL\_SCHEMA

```ts
const FINISH_SECTIONAL_SCHEMA: SchemaSpec;
```

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L178)

The finish schema under sectional repair (RV808b): `result` OR
`sections`, host-enforced as exactly one (a JSON schema union would
cost the model a worse error surface than the typed host refusal).
`sections` maps a DECLARED marker line to the new section body; the
host splices it into the retained rejected attempt and validates the
reconstructed document whole. Swapped in only under the
`finishValidation.sectionalRepair` opt-in, so the default toolset
hash never moves.

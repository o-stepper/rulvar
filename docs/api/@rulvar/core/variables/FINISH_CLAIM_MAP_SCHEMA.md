[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FINISH\_CLAIM\_MAP\_SCHEMA

# Variable: FINISH\_CLAIM\_MAP\_SCHEMA

```ts
const FINISH_CLAIM_MAP_SCHEMA: SchemaSpec;
```

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L208)

The finish schema under the claim map opt-in (RV4305):
`synthesis.claimMap: true` makes the map a REQUIRED companion of the
composed result, so a composition cannot ship without declaring what
it claims and on what evidence. Swapped in only for the synthesis
invocation under the opt-in, so the default toolset hash never
moves; under the opt-in it moves BY DESIGN (the sectional
precedent): the contract of the finish call changed.

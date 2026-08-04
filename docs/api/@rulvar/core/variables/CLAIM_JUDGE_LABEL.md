[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CLAIM\_JUDGE\_LABEL

# Variable: CLAIM\_JUDGE\_LABEL

```ts
const CLAIM_JUDGE_LABEL: "claim-consistency-judge" = 'claim-consistency-judge';
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L351)

The label the claim-consistency judge invocation dispatches under
(RV1502; named here since RV1604 so the critical-path reducer and the
orchestrator share one constant): the judge rides role 'synthesize',
and this label is what tells its wall apart from a real final
composition in [reduceCriticalPath](/api/@rulvar/core/functions/reduceCriticalPath.md).

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TaskSpec

# Type Alias: TaskSpec

```ts
type TaskSpec = Json;
```

Defined in: [packages/core/src/runtime/escalation.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L36)

Minimal TaskSpec stand-in: the full typed TaskSpec is owned by the
PlanRunner surface (docs/07, section 4.1) and ships with M7; script
modes carry proposals opaquely until then.

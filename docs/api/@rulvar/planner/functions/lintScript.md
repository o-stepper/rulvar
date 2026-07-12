[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / lintScript

# Function: lintScript()

```ts
function lintScript(source): {
  diagnostics: PlanDiagnostic[];
  errors: PlanDiagnostic[];
  workflow?: CompiledWorkflow;
};
```

Defined in: [packages/planner/src/plan.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L69)

Lints a script BODY with the workflows preset plus compileScript.
The body is wrapped in an async function for parsing (top-level
return/await are legal in the dialect); reported lines shift back so
they index into the body source.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |

## Returns

```ts
{
  diagnostics: PlanDiagnostic[];
  errors: PlanDiagnostic[];
  workflow?: CompiledWorkflow;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `diagnostics` | [`PlanDiagnostic`](/api/@rulvar/planner/interfaces/PlanDiagnostic.md)[] | [packages/planner/src/plan.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L70) |
| `errors` | [`PlanDiagnostic`](/api/@rulvar/planner/interfaces/PlanDiagnostic.md)[] | [packages/planner/src/plan.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L71) |
| `workflow?` | [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) | [packages/planner/src/plan.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L72) |

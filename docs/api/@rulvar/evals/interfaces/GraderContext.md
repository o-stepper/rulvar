[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / GraderContext

# Interface: GraderContext

Defined in: [packages/evals/src/case.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L61)

What a grader sees; judge() is the only channel back into the engine.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-outcome"></a> `outcome` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt; | The full target outcome, for status- and cost-aware graders. | [packages/evals/src/case.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L65) |
| <a id="property-value"></a> `value` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) \| `undefined` | The target run's structured output (RunOutcome.value). | [packages/evals/src/case.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L63) |

## Methods

### judge()

```ts
judge(spec): Promise<Json>;
```

Defined in: [packages/evals/src/case.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L71)

Runs one judge invocation through the engine (journaled, budgeted,
VCR-recordable) and returns the judge's structured output. Throws
when the judge run itself does not settle ok.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`JudgeSpec`](/api/@rulvar/evals/interfaces/JudgeSpec.md) |

#### Returns

`Promise`\&lt;[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt;

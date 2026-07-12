[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / Grader

# Interface: Grader

Defined in: [packages/evals/src/case.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L74)

@rulvar/evals: quality measurement strictly on the public APIs (L6).
EvalCase with golden, rubric, and LLM-judge graders; judge calls run
through the engine (journaled, budgeted, VCR-recordable), so eval CI is
deterministic; config-matrix comparison reports pass-rate, cost, and
latency per cell (docs/09, section "@rulvar/evals"; docs/11, section
"Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer
identity, and canary fingerprints are the M11 round-3 extensions.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | [packages/evals/src/case.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L75) |

## Methods

### grade()

```ts
grade(context): 
  | GraderVerdict
| Promise<GraderVerdict>;
```

Defined in: [packages/evals/src/case.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L76)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`GraderContext`](/api/@rulvar/evals/interfaces/GraderContext.md) |

#### Returns

  \| [`GraderVerdict`](/api/@rulvar/evals/interfaces/GraderVerdict.md)
  \| `Promise`\&lt;[`GraderVerdict`](/api/@rulvar/evals/interfaces/GraderVerdict.md)\&gt;

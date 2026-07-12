[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunCheckpointOptions

# Interface: RunCheckpointOptions

Defined in: [packages/evals/src/checkpoint.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L64)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-enginefor"></a> `engineFor` | (`member`) => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | An engine per concrete pool member (the caller owns adapters and budgets). | [packages/evals/src/checkpoint.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L70) |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date of the evaluation (recorded in the report; no wall clock inside). | [packages/evals/src/checkpoint.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L68) |
| <a id="property-orchestratedcases"></a> `orchestratedCases?` | [`OrchestratedCase`](/api/@rulvar/evals/interfaces/OrchestratedCase.md)[] | - | [packages/evals/src/checkpoint.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L76) |
| <a id="property-orchestratedsuite"></a> `orchestratedSuite?` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | Orchestrated runs need room for the orchestrator cap math (the run ceiling must host the finalize reserve; docs/07, 12.2): their suite options default to `suite` but usually carry a larger budgetUsd. | [packages/evals/src/checkpoint.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L84) |
| <a id="property-orchestrateenginefor"></a> `orchestrateEngineFor?` | (`withKnowledge`) => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | Criterion 2 engines: withKnowledge true configures the SAME store snapshot behind stores.modelKnowledge; false omits it entirely. | [packages/evals/src/checkpoint.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L75) |
| <a id="property-snapshot"></a> `snapshot` | [`KnowledgeSnapshot`](/api/@rulvar/rulvar/interfaces/KnowledgeSnapshot.md) | The claims snapshot produced by the seeding sweep (disjoint cases). | [packages/evals/src/checkpoint.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L66) |
| <a id="property-suite"></a> `suite?` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | - | [packages/evals/src/checkpoint.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L77) |

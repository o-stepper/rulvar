[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunCheckpointOptions

# Interface: RunCheckpointOptions

Defined in: [packages/evals/src/checkpoint.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L63)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-enginefor"></a> `engineFor` | (`member`) => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | An engine per concrete pool member (the caller owns adapters and budgets). | [packages/evals/src/checkpoint.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L69) |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date of the evaluation (recorded in the report; no wall clock inside). | [packages/evals/src/checkpoint.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L67) |
| <a id="property-orchestratedcases"></a> `orchestratedCases?` | [`OrchestratedCase`](/api/@rulvar/evals/interfaces/OrchestratedCase.md)[] | - | [packages/evals/src/checkpoint.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L75) |
| <a id="property-orchestratedsuite"></a> `orchestratedSuite?` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | Orchestrated runs need room for the orchestrator cap math (the run ceiling must host the finalize reserve): their suite options default to `suite` but usually carry a larger budgetUsd. | [packages/evals/src/checkpoint.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L83) |
| <a id="property-orchestrateenginefor"></a> `orchestrateEngineFor?` | (`withKnowledge`) => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | Criterion 2 engines: withKnowledge true configures the SAME store snapshot behind stores.modelKnowledge; false omits it entirely. | [packages/evals/src/checkpoint.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L74) |
| <a id="property-snapshot"></a> `snapshot` | [`KnowledgeSnapshot`](/api/@rulvar/rulvar/interfaces/KnowledgeSnapshot.md) | The claims snapshot produced by the seeding sweep (disjoint cases). | [packages/evals/src/checkpoint.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L65) |
| <a id="property-suite"></a> `suite?` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | - | [packages/evals/src/checkpoint.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L76) |

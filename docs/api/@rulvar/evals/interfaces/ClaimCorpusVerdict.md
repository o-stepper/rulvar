[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ClaimCorpusVerdict

# Interface: ClaimCorpusVerdict

Defined in: [packages/evals/src/claim-corpus.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L176)

One case's verdict: mechanical expectations against the folds' output.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-class"></a> `class` | [`ClaimCorpusClass`](/api/@rulvar/evals/type-aliases/ClaimCorpusClass.md) | - | [packages/evals/src/claim-corpus.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L178) |
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md) | The grade the assembled meta carries. | [packages/evals/src/claim-corpus.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L187) |
| <a id="property-failures"></a> `failures` | `string`[] | Every unmet expectation, named; empty exactly when `pass`. | [packages/evals/src/claim-corpus.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L181) |
| <a id="property-id"></a> `id` | `string` | - | [packages/evals/src/claim-corpus.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L177) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed source-claim pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L183) |
| <a id="property-pass"></a> `pass` | `boolean` | - | [packages/evals/src/claim-corpus.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L179) |
| <a id="property-runfactpairs"></a> `runFactPairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed run-facts pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L185) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ClaimCorpusVerdict

# Interface: ClaimCorpusVerdict

Defined in: [packages/evals/src/claim-corpus.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L337)

One case's verdict: mechanical expectations against the folds' output.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-class"></a> `class` | [`ClaimCorpusClass`](/api/@rulvar/evals/type-aliases/ClaimCorpusClass.md) | - | [packages/evals/src/claim-corpus.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L339) |
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md) | The grade the assembled meta carries. | [packages/evals/src/claim-corpus.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L348) |
| <a id="property-failures"></a> `failures` | `string`[] | Every unmet expectation, named; empty exactly when `pass`. | [packages/evals/src/claim-corpus.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L342) |
| <a id="property-id"></a> `id` | `string` | - | [packages/evals/src/claim-corpus.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L338) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed source-claim pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L344) |
| <a id="property-pass"></a> `pass` | `boolean` | - | [packages/evals/src/claim-corpus.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L340) |
| <a id="property-runfactpairs"></a> `runFactPairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed run-facts pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:346](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L346) |

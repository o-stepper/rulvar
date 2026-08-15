[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ClaimCorpusVerdict

# Interface: ClaimCorpusVerdict

Defined in: [packages/evals/src/claim-corpus.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L296)

One case's verdict: mechanical expectations against the folds' output.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-class"></a> `class` | [`ClaimCorpusClass`](/api/@rulvar/evals/type-aliases/ClaimCorpusClass.md) | - | [packages/evals/src/claim-corpus.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L298) |
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md) | The grade the assembled meta carries. | [packages/evals/src/claim-corpus.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L307) |
| <a id="property-failures"></a> `failures` | `string`[] | Every unmet expectation, named; empty exactly when `pass`. | [packages/evals/src/claim-corpus.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L301) |
| <a id="property-id"></a> `id` | `string` | - | [packages/evals/src/claim-corpus.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L297) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed source-claim pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L303) |
| <a id="property-pass"></a> `pass` | `boolean` | - | [packages/evals/src/claim-corpus.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L299) |
| <a id="property-runfactpairs"></a> `runFactPairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The formed run-facts pairs, for judge handoff. | [packages/evals/src/claim-corpus.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L305) |

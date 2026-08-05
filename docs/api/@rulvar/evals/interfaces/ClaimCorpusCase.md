[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ClaimCorpusCase

# Interface: ClaimCorpusCase

Defined in: [packages/evals/src/claim-corpus.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L55)

One adversarial case: a draft, its contradicting evidence, and the mechanical expectations.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-class"></a> `class` | [`ClaimCorpusClass`](/api/@rulvar/evals/type-aliases/ClaimCorpusClass.md) | - | [packages/evals/src/claim-corpus.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L57) |
| <a id="property-critical"></a> `critical?` | readonly `string`[] | Critical anchor declarations, exactly as a caller would pass them. | [packages/evals/src/claim-corpus.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L67) |
| <a id="property-draft"></a> `draft` | `string` | The composed prose committing the falsehood. | [packages/evals/src/claim-corpus.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L59) |
| <a id="property-expect"></a> `expect` | \{ `anchors?`: readonly `string`[]; `coverage?`: [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md); `minPairs?`: `number`; `minRunFactPairs?`: `number`; \} | - | [packages/evals/src/claim-corpus.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L70) |
| `expect.anchors?` | readonly `string`[] | Anchors that must appear among the formed pairs. | [packages/evals/src/claim-corpus.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L76) |
| `expect.coverage?` | [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md) | The coverage grade the assembled meta must carry. | [packages/evals/src/claim-corpus.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L78) |
| `expect.minPairs?` | `number` | Source-claim pairs the fold must form, at minimum. | [packages/evals/src/claim-corpus.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L72) |
| `expect.minRunFactPairs?` | `number` | Run-facts pairs the fold must form, at minimum. | [packages/evals/src/claim-corpus.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L74) |
| <a id="property-id"></a> `id` | `string` | - | [packages/evals/src/claim-corpus.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L56) |
| <a id="property-max"></a> `max?` | `number` | Pair bound override, for the bounded-coverage class. | [packages/evals/src/claim-corpus.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L69) |
| <a id="property-pool"></a> `pool?` | readonly [`ContradictionSource`](/api/@rulvar/rulvar/interfaces/ContradictionSource.md)[] | Settled pool readings that contradict it (source-claim classes). | [packages/evals/src/claim-corpus.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L61) |
| <a id="property-runfacts"></a> `runFacts?` | [`RunFactsSheet`](/api/@rulvar/rulvar/interfaces/RunFactsSheet.md) | The recorded fact sheet that contradicts it (run-claim classes). | [packages/evals/src/claim-corpus.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L63) |
| <a id="property-runfactterms"></a> `runFactTerms?` | readonly `string`[] | Caller-style substring triggers for the run-facts arm. | [packages/evals/src/claim-corpus.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L65) |

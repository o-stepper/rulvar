[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ContractAuditLex

# Interface: ContractAuditLex

Defined in: [packages/evals/src/lexer.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L89)

The lex of one contract audited document.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-citationoccurrences"></a> `citationOccurrences` | `readonly` | `number` | Accepted citation occurrences, the headline count. | [packages/evals/src/lexer.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L91) |
| <a id="property-citations"></a> `citations` | `readonly` | readonly [`LexedCitation`](/api/@rulvar/evals/interfaces/LexedCitation.md)[] | - | [packages/evals/src/lexer.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L92) |
| <a id="property-distinctrequirementcounts"></a> `distinctRequirementCounts` | `readonly` | `Readonly`\&lt;`Record`\&lt;`string`, `number`\&gt;\&gt; | Distinct ids per family, the contract set size. | [packages/evals/src/lexer.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L99) |
| <a id="property-persection"></a> `perSection` | `readonly` | readonly \{ `citations`: `number`; `heading`: `string`; \}[] | Accepted citations per H2 section, in document order. | [packages/evals/src/lexer.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L101) |
| <a id="property-rejected"></a> `rejected` | `readonly` | readonly [`RejectedCitationSpan`](/api/@rulvar/evals/interfaces/RejectedCitationSpan.md)[] | - | [packages/evals/src/lexer.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L95) |
| <a id="property-requirementids"></a> `requirementIds` | `readonly` | `Readonly`\&lt;`Record`\&lt;`string`, readonly [`LexedRequirementId`](/api/@rulvar/evals/interfaces/LexedRequirementId.md)[]\&gt;\&gt; | Every id occurrence per family, in document order. | [packages/evals/src/lexer.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L97) |
| <a id="property-uniqueanchors"></a> `uniqueAnchors` | `readonly` | readonly `string`[] | Distinct accepted raw spans, in first occurrence order. | [packages/evals/src/lexer.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L94) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / LexedRequirementId

# Interface: LexedRequirementId

Defined in: [packages/evals/src/lexer.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L76)

One requirement id occurrence with the notation it was written in.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-family"></a> `family` | `readonly` | `string` | - | [packages/evals/src/lexer.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L79) |
| <a id="property-form"></a> `form` | `readonly` | `"colon"` \| `"dash"` \| `"table"` \| `"bare"` | 'colon' for `N01:` (a period counts), 'dash' for a dash separated list item, 'table' for a table row cell, 'bare' otherwise. | [packages/evals/src/lexer.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L85) |
| <a id="property-id"></a> `id` | `readonly` | `string` | The id verbatim, e.g. 'N01'. | [packages/evals/src/lexer.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L78) |
| <a id="property-ordinal"></a> `ordinal` | `readonly` | `number` | - | [packages/evals/src/lexer.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L80) |

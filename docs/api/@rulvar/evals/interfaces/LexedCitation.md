[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / LexedCitation

# Interface: LexedCitation

Defined in: [packages/evals/src/lexer.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L59)

One accepted citation occurrence, in document order.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-endline"></a> `endLine?` | `readonly` | `number` | - | [packages/evals/src/lexer.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L64) |
| <a id="property-line"></a> `line` | `readonly` | `number` | - | [packages/evals/src/lexer.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L63) |
| <a id="property-path"></a> `path` | `readonly` | `string` | - | [packages/evals/src/lexer.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L62) |
| <a id="property-raw"></a> `raw` | `readonly` | `string` | The raw span, range tail included. | [packages/evals/src/lexer.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L61) |
| <a id="property-section"></a> `section` | `readonly` | `string` | The H2 heading the occurrence sits under; '' before the first. | [packages/evals/src/lexer.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L66) |

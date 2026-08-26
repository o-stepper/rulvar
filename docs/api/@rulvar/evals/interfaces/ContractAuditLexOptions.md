[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ContractAuditLexOptions

# Interface: ContractAuditLexOptions

Defined in: [packages/evals/src/lexer.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L104)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extensions"></a> `extensions?` | readonly `string`[] | Overrides [DEFAULT\_CITATION\_EXTENSIONS](/api/@rulvar/evals/variables/DEFAULT_CITATION_EXTENSIONS.md); lowercase, no dots. | [packages/evals/src/lexer.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L108) |
| <a id="property-families"></a> `families?` | readonly `string`[] | Overrides [DEFAULT\_REQUIREMENT\_FAMILIES](/api/@rulvar/evals/variables/DEFAULT_REQUIREMENT_FAMILIES.md); single uppercase letters. | [packages/evals/src/lexer.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L116) |
| <a id="property-fencedcode"></a> `fencedCode?` | `"excluded"` \| `"counted"` | 'excluded' (the default) strips fenced code before both scans. | [packages/evals/src/lexer.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L118) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line`. | [packages/evals/src/lexer.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L106) |
| <a id="property-resolve"></a> `resolve?` | (`target`) => `string` \| `undefined` | The pure snapshot resolver (the citation audit contract). When present, a citation whose FIRST cited line does not resolve is rejected 'unresolved'; absent, extension acceptance stands alone. | [packages/evals/src/lexer.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L114) |

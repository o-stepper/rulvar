[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / [eslint-plugin-rulvar](/api/eslint-plugin-rulvar/index.md) / DialectFinding

# Interface: DialectFinding

Defined in: [packages/eslint-plugin-rulvar/src/dialect-scan.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/eslint-plugin-rulvar/src/dialect-scan.ts#L25)

Where a finding sits in the ORIGINAL source (line and column counted from 1).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-column"></a> `column` | `number` | [packages/eslint-plugin-rulvar/src/dialect-scan.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/eslint-plugin-rulvar/src/dialect-scan.ts#L28) |
| <a id="property-kind"></a> `kind` | `"eval"` \| `"function-constructor"` \| `"constructor-access"` | [packages/eslint-plugin-rulvar/src/dialect-scan.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/eslint-plugin-rulvar/src/dialect-scan.ts#L26) |
| <a id="property-line"></a> `line` | `number` | [packages/eslint-plugin-rulvar/src/dialect-scan.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/eslint-plugin-rulvar/src/dialect-scan.ts#L27) |

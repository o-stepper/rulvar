[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / [eslint-plugin-rulvar](/api/eslint-plugin-rulvar/index.md) / scanDialect

# Function: scanDialect()

```ts
function scanDialect(program): DialectFinding[];
```

Defined in: [packages/eslint-plugin-rulvar/src/dialect-scan.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/eslint-plugin-rulvar/src/dialect-scan.ts#L198)

Structural scan for compileScript: every dynamic code generation form the
dialect rejects, as findings positioned in the original source. Covers bare
`eval`/`Function` calls and `new`, `globalThis.eval`/`globalThis.Function`,
and every constructor reconstruction form the shared predicates recognize.
Member access on other objects (`response.eval`, `parser.Function`) and a
property NAMED constructor in an object LITERAL are not code generation and
are left alone.

Takes a parsed ESTree Program, typed `unknown` so a caller needs neither the
estree types nor a specific parser in its own public surface; any ESTree
compatible parser (espree in the lint pass, acorn in compileScript) works.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `program` | `unknown` |

## Returns

[`DialectFinding`](/api/eslint-plugin-rulvar/interfaces/DialectFinding.md)[]

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / lexContractAudit

# Function: lexContractAudit()

```ts
function lexContractAudit(text, options?): ContractAuditLex;
```

Defined in: [packages/evals/src/lexer.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/lexer.ts#L133)

Lexes one document under the shared contract audit grammar; see the
module comment for the doctrine. Malformed options refuse typed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options?` | [`ContractAuditLexOptions`](/api/@rulvar/evals/interfaces/ContractAuditLexOptions.md) |

## Returns

[`ContractAuditLex`](/api/@rulvar/evals/interfaces/ContractAuditLex.md)

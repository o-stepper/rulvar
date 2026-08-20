[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / semanticTerminalVerdictOf

# Function: semanticTerminalVerdictOf()

```ts
function semanticTerminalVerdictOf(input): 
  | SemanticTerminalVerdict
  | undefined;
```

Defined in: [packages/core/src/orchestrator/semantic-verdict.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L78)

Folds the one semantic verdict out of envelope facts (RV4209).
Returns undefined when NO semantic meta is present: nothing was
configured, nothing judged anything, and absence must keep meaning
NOT RECORDED rather than a fabricated verdict. Never throws on
malformed shapes: an untyped field reads as absent, and the verdict
degrades toward 'not-judged', the fail-closed direction.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SemanticVerdictInput`](/api/@rulvar/core/interfaces/SemanticVerdictInput.md) |

## Returns

  \| [`SemanticTerminalVerdict`](/api/@rulvar/core/interfaces/SemanticTerminalVerdict.md)
  \| `undefined`

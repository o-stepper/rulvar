[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / semanticTerminalVerdictOf

# Function: semanticTerminalVerdictOf()

```ts
function semanticTerminalVerdictOf(input): 
  | SemanticTerminalVerdict
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Folds the one semantic verdict out of envelope facts (RV4209).
Returns undefined when NO semantic meta is present: nothing was
configured, nothing judged anything, and absence must keep meaning
NOT RECORDED rather than a fabricated verdict. Never throws on
malformed shapes, and malformation degrades toward 'not-judged',
the fail-closed direction (RV4402): a meta that carries NO evidence
anything judged (no judgedHash/auditedHash, no judgeInvoked, no
judge flag, no judgedStage) folds 'not-judged' with a trust code,
never 'clean', and a counter that is present but not a count taints
its meta the same way. An ABSENT field still reads absent: absence
is honest, garbage is not.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SemanticVerdictInput`](/api/@rulvar/rulvar/interfaces/SemanticVerdictInput.md) |

## Returns

  \| [`SemanticTerminalVerdict`](/api/@rulvar/rulvar/interfaces/SemanticTerminalVerdict.md)
  \| `undefined`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / classifyEvidenceFile

# Function: classifyEvidenceFile()

```ts
function classifyEvidenceFile(file): EvidenceCategory;
```

Defined in: `packages/core/dist/index.d.ts`

The default path classifier: a test file name (`.test.` or `.spec.`)
or a test directory segment is `tests`; an `examples` directory
segment is `examples`; a `docs` directory segment or a prose file
(markdown, restructured text, plain text) is `docs`; everything else
is `implementation`. Tests win over examples and docs (a test under
`examples/` is a test), examples win over docs (a markdown page under
`examples/` is an example). Deterministic from the path alone.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `file` | `string` |

## Returns

[`EvidenceCategory`](/api/@rulvar/rulvar/type-aliases/EvidenceCategory.md)

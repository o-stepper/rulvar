[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_ANCHOR\_PATTERN

# Variable: DEFAULT\_ANCHOR\_PATTERN

```ts
const DEFAULT_ANCHOR_PATTERN: string;
```

Defined in: [packages/core/src/orchestrator/consistency.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L41)

The default anchor shape: the finish validators' citation pattern
extended with an optional `-end` line range, because composed dossiers
routinely cite spans (`src/exec.ts:256-296`) where the single-line
pattern would silently read only the first line.

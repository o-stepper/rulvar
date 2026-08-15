[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_ARTIFACT\_PATTERN

# Variable: DEFAULT\_ARTIFACT\_PATTERN

```ts
const DEFAULT_ARTIFACT_PATTERN: "(?:run[ -]?[0-9A-HJKMNP-TV-Z]{6,26}|[\w./-]+\.\w+:\d+)" = '(?:run[ -]?[0-9A-HJKMNP-TV-Z]{6,26}|[\w./-]+\.\w+:\d+)';
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1179)

The default artifact reference: a run id (ULID-shaped, the ids the
engine mints) or a `path:line` citation.

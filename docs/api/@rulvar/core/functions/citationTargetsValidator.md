[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / citationTargetsValidator

# Function: citationTargetsValidator()

```ts
function citationTargetsValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1144)

Resolves EVERY citation in the result text against the host's own
source snapshot (RV1401, the seventeenth comparison experiment
P0-1). The seventeenth run's answer carried `ghost.ts:0`, a location
no checkout ever held, and every configured check passed: the
citation pattern accepts any digits (a line of 0 included),
`requireKnown` proves only that a child SAID the string, and
[citedValueValidator](/api/@rulvar/core/functions/citedValueValidator.md) resolves a citation only when its
sentence asserts an inline value beside it. A fabricated location
that no sentence asserts anything about therefore counted as
provenance and licensed the valid-draft skip. This validator closes
the hole at the root: every match of `pattern`, inline code and
plain prose alike, is parsed as `path:line` and resolved, with no
sentence-level precondition.

Three refusals, each fail closed:

- a match that does not parse as `path:line` (a custom pattern
  matched something the tail cannot split) is refused rather than
  skipped, because an unjudgeable citation must never read as
  judged;
- a line below 1 is refused BEFORE the resolver runs: source lines
  are 1-based, `:0` is the exact shape the default pattern lets
  through, and a sloppy host resolver might well answer it;
- a citation the resolver does not know is refused: a citation
  nothing resolves is not provenance.

`resolve` is the same host contract [citedValueValidator](/api/@rulvar/core/functions/citedValueValidator.md)
takes: PURE over a snapshot the host froze before the run
(returning undefined for a location outside it), never the live
filesystem. Repeated occurrences are judged once. `fencedCode:
'excluded'` strips fenced code before scanning, for hosts whose
contracts already exclude it; the default judges the whole text.
Intake is fail closed (RV610): a pattern that cannot compile or
that can match the empty string is refused typed. Default name
'citation-targets'.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md); `name?`: `string`; `pattern?`: `string`; `resolve`: (`target`) => `string` \| `undefined`; \} | - |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/core/type-aliases/FencedCodeMode.md) | 'excluded' strips fenced code before scanning; default 'counted'. |
| `options.name?` | `string` | - |
| `options.pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must capture `path:line`. |
| `options.resolve` | (`target`) => `string` \| `undefined` | - |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)

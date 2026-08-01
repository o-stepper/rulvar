[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / citationTargetsValidator

# Function: citationTargetsValidator()

```ts
function citationTargetsValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

Resolves EVERY citation of the result text against the host's own
source snapshot (RV1401, the seventeenth comparison experiment
P0-1). The seventeenth run's answer carried `ghost.ts:0`, a location
no checkout ever held, and the whole configured chain passed it: the
citation pattern accepts any digits (a line of 0 included),
`evidencePreservedValidator`'s `requireKnown` proves only that some
child SAID the string, and [citedValueValidator](/api/@rulvar/rulvar/functions/citedValueValidator.md) resolves a
citation only when its sentence asserts an inline value beside it,
so a fabricated location nobody asserted anything about counted as
provenance and licensed the valid-draft skip. This validator closes
the hole at the root: every match of `pattern` in the result text,
inline code and plain prose alike, is parsed as `path:line` and
resolved, with no sentence-level precondition.

Three refusals, each fail closed. A match that does not parse as
`path:line` with a safe integer line is refused rather than skipped:
the host's own pattern claims it IS a citation. A line below 1 is
refused BEFORE the resolver runs: source lines are 1-based, and a
sloppy resolver might well answer line 0. A citation the resolver
does not know is refused, because a citation nothing resolves is not
provenance. Repeated occurrences are judged once, and refusal
reasons list the offenders capped at 20.

`resolve` is host code and must be PURE over a snapshot the host
froze before the run, exactly like [citedValueValidator](/api/@rulvar/rulvar/functions/citedValueValidator.md)'s: a
resolver reading the filesystem live would make a verdict depend on
when it ran and break replay. `fencedCode: 'excluded'` strips fenced
code before scanning (default 'counted'), for hosts whose contracts
already exclude it. A text with no citation at all passes: demanding
citations exist is `minMatchesValidator`'s job, this one demands the
ones present are real. Intake is fail closed (RV610): a pattern that
does not compile or that can match the empty string is refused
typed, and zero-length matches a lookaround produces in context
never enter the pool. Wired into `finishValidation`, the refusal
also reaches the `skipWhenDraftValid` gate (RV510 judges the draft
by the full declared contract), so a draft carrying an unresolvable
citation can no longer skip the synthesis it was supposed to earn.
Default name 'citation-targets'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `fencedCode?`: [`FencedCodeMode`](/api/@rulvar/rulvar/type-aliases/FencedCodeMode.md); `name?`: `string`; `pattern?`: `string`; `resolve`: (`target`) => `string` \| `undefined`; \} |
| `options.fencedCode?` | [`FencedCodeMode`](/api/@rulvar/rulvar/type-aliases/FencedCodeMode.md) |
| `options.name?` | `string` |
| `options.pattern?` | `string` |
| `options.resolve` | (`target`) => `string` \| `undefined` |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / productionAcceptable

# Function: productionAcceptable()

```ts
function productionAcceptable(verdict): {
  ok: boolean;
  reason?: string;
};
```

Defined in: [packages/core/src/orchestrator/semantic-verdict.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L251)

The production acceptance predicate (RV4209): the one boolean a
production consumer gates on, with the stable reason when it
refuses. A verdict is production-acceptable exactly when it exists
and reads 'clean': 'partial' and 'vacuous' are legal diagnostics
(strict keeps exit 0 on them by documented design), 'waived' is a
human exception a machine gate must surface rather than inherit,
and an ABSENT verdict means nothing judged anything, which a
production gate reads fail closed. The refusal reason distinguishes
the two refusal shapes a reader used to conflate (RV4402): an
absent verdict reads 'not-recorded' (nothing was configured, or the
run predates the fold), while a recorded 'not-judged' verdict lists
its judge failure codes, so an operator can tell "the machinery
never wrote a verdict" from "judges ran and nothing usable judged
the shipped document". Exported so the CLI's `--acceptance-policy
production`, a server consumer, and a host pipeline apply the SAME
rule instead of three re-derivations.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `verdict` | \| [`SemanticTerminalVerdict`](/api/@rulvar/core/interfaces/SemanticTerminalVerdict.md) \| `undefined` |

## Returns

```ts
{
  ok: boolean;
  reason?: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `ok` | `boolean` | [packages/core/src/orchestrator/semantic-verdict.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L252) |
| `reason?` | `string` | [packages/core/src/orchestrator/semantic-verdict.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L253) |

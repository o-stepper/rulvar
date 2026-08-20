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

Defined in: [packages/core/src/orchestrator/semantic-verdict.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L182)

The production acceptance predicate (RV4209): the one boolean a
production consumer gates on, with the stable reason when it
refuses. A verdict is production-acceptable exactly when it exists
and reads 'clean': 'partial' and 'vacuous' are legal diagnostics
(strict keeps exit 0 on them by documented design), 'waived' is a
human exception a machine gate must surface rather than inherit,
and an ABSENT verdict means nothing judged anything, which a
production gate reads fail closed. Exported so the CLI's
`--acceptance-policy production`, a server consumer, and a host
pipeline apply the SAME rule instead of three re-derivations.

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
| `ok` | `boolean` | [packages/core/src/orchestrator/semantic-verdict.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L183) |
| `reason?` | `string` | [packages/core/src/orchestrator/semantic-verdict.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L184) |

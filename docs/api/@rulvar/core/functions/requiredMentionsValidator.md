[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / requiredMentionsValidator

# Function: requiredMentionsValidator()

```ts
function requiredMentionsValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1798](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1798)

Every declared literal must appear in the finish result at least
once (RV3308). The 2026-08-12 comparison run passed an exact twelve
heading contract and a citation floor while its "all publishable
packages" table silently dropped four of the seventeen names: shape
validators cannot see an enumerable universe, so the universe is
declared as literals and each one is held. Purely textual and
deterministic; fenced code counts, because tables and inline code
are legitimate places to name a package. Default name
'required-mentions'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `name?`: `string`; `terms`: readonly `string`[]; \} |
| `options.name?` | `string` |
| `options.terms` | readonly `string`[] |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)

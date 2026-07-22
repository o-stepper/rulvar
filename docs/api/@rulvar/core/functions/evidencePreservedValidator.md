[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / evidencePreservedValidator

# Function: evidencePreservedValidator()

```ts
function evidencePreservedValidator(options?): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L176)

The RV-202 evidence preservation contract: the finish result must
PRESERVE the citations the children actually produced. Distinct
matches of `pattern` are collected across the outputs of children
settled 'ok' (spawn order); at least `minShare` of them (default
[DEFAULT\_EVIDENCE\_MIN\_SHARE](/api/@rulvar/core/variables/DEFAULT_EVIDENCE_MIN_SHARE.md), the plan's 95 percent gate,
compared as a ceiling on the required count so an exact boundary like
19 of 20 passes) must appear literally in the result text. Zero child
citations pass vacuously. With `requireKnown: true` the contract also
runs in reverse: every citation in the RESULT must appear in some
child's output, so a fabricated but pattern valid citation is
rejected instead of silently counting as evidence. Rejection reasons
list the missing (and unknown) citations, capped at 20, so the repair
turn can restore them. Purely textual and deterministic; checking
that cited targets EXIST on disk is host territory (a custom
validator), not this contract. Default name 'evidence-preserved'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | \{ `flags?`: `string`; `minShare?`: `number`; `name?`: `string`; `pattern?`: `string`; `requireKnown?`: `boolean`; \} |
| `options.flags?` | `string` |
| `options.minShare?` | `number` |
| `options.name?` | `string` |
| `options.pattern?` | `string` |
| `options.requireKnown?` | `boolean` |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)

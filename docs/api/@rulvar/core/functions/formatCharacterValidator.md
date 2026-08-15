[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / formatCharacterValidator

# Function: formatCharacterValidator()

```ts
function formatCharacterValidator(options?): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1734](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1734)

Rejects invisible Unicode format characters in the result text
(RV1509, the eighteenth improvement plan). The seventeenth
comparison run's answer carried five U+200B characters immediately
before hidden-file citations, and every configured check passed:
the citation pattern's boundary class simply excluded the invisible
byte from the match, so the extracted citations were clean while
the LITERAL text was not byte-identical to any repository path. A
format character in a dossier is at best copy-paste rot and at
worst a smuggling channel, so the default is to reject the whole
category (Unicode `Cf`: zero-width spaces and joiners, the word
joiner, the BOM, bidi controls, soft hyphens), each distinct
character listed once with its codepoint, first index, occurrence
count, and a short visible-context excerpt, so the repair turn can
find the exact bytes. `allow` admits specific characters for hosts
whose content legitimately needs them (bidi marks in RTL prose);
every allow entry must itself be a single `Cf` character, refused
typed otherwise (the RV610 posture: a typo in the allow list must
not silently widen it). Purely textual and deterministic. Default
name 'format-characters'.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | \{ `allow?`: readonly `string`[]; `name?`: `string`; \} | - |
| `options.allow?` | readonly `string`[] | Single `Cf` characters to admit; everything else still rejects. |
| `options.name?` | `string` | - |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)

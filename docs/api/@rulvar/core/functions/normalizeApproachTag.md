[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / normalizeApproachTag

# Function: normalizeApproachTag()

```ts
function normalizeApproachTag(raw?): string;
```

Defined in: [packages/core/src/journal/lineage.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L166)

Approach-tag normalization: NFC, lowercase, runs of
non-alphanumerics collapse into a hyphen, truncate to 32 characters; an
empty value canonicalizes to 'default'. Prompt prose never enters any
signature: rephrasings collide by construction, not by heuristic.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw?` | `string` |

## Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / normalizeApproachTag

# Function: normalizeApproachTag()

```ts
function normalizeApproachTag(raw?): string;
```

Defined in: `packages/core/dist/index.d.ts`

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

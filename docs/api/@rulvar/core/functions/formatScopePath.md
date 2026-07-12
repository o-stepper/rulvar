[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / formatScopePath

# Function: formatScopePath()

```ts
function formatScopePath(segments): string;
```

Defined in: [packages/core/src/journal/scope.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L123)

Serializes parsed segments back to the canonical path (round-trip).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `segments` | readonly [`ScopeSegment`](/api/@rulvar/core/type-aliases/ScopeSegment.md)[] |

## Returns

`string`

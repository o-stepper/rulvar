[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / usageViolations

# Function: usageViolations()

```ts
function usageViolations(usage): string[];
```

Defined in: `packages/core/dist/index.d.ts`

Names every rule the given usage violates; an empty array means the
usage satisfies the full canonical invariant: each present count is a
finite nonnegative integer and
`cacheReadTokens + cacheWriteTokens <= inputTokens`. The subset rule
is checked with a negated comparison so a NaN operand counts as a
violation rather than vacuously passing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

`string`[]

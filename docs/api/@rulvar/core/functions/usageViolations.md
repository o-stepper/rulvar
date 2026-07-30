[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / usageViolations

# Function: usageViolations()

```ts
function usageViolations(usage): string[];
```

Defined in: [packages/core/src/l0/usage.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/usage.ts#L48)

Names every rule the given usage violates; an empty array means the
usage satisfies the full canonical invariant: each present count is a
finite nonnegative integer and
`cacheReadTokens + cacheWriteTokens <= inputTokens`. The subset rule
is checked with a negated comparison so a NaN operand counts as a
violation rather than vacuously passing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

`string`[]

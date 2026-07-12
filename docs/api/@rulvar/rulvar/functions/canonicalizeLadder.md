[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / canonicalizeLadder

# Function: canonicalizeLadder()

```ts
function canonicalizeLadder(spec, options?): CanonicalLadderSpec;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Canonicalizes a declared LadderSpec (docs/04, section 12): validates the
shape once (FR-119 judge declaration included) and resolves every rung's
effort to an explicit value. `chainEffort` is the effort the resolution
chain would contribute at the declaring layer; a rung that resolves no
effort at all is a ConfigError (the canonical form has no absent-effort
member by declaration).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`LadderSpec`](/api/@rulvar/rulvar/interfaces/LadderSpec.md) |
| `options?` | \{ `chainEffort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); \} |
| `options.chainEffort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) |

## Returns

[`CanonicalLadderSpec`](/api/@rulvar/rulvar/interfaces/CanonicalLadderSpec.md)

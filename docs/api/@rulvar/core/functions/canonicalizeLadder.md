[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / canonicalizeLadder

# Function: canonicalizeLadder()

```ts
function canonicalizeLadder(spec, options?): CanonicalLadderSpec;
```

Defined in: [packages/core/src/model/router.ts:365](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L365)

Canonicalizes a declared LadderSpec: validates the
shape once (FR-119 judge declaration included) and resolves every rung's
effort to an explicit value. `chainEffort` is the effort the resolution
chain would contribute at the declaring layer; a rung that resolves no
effort at all is a ConfigError (the canonical form has no absent-effort
member by declaration).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`LadderSpec`](/api/@rulvar/core/interfaces/LadderSpec.md) |
| `options?` | \{ `chainEffort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); \} |
| `options.chainEffort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) |

## Returns

[`CanonicalLadderSpec`](/api/@rulvar/core/interfaces/CanonicalLadderSpec.md)

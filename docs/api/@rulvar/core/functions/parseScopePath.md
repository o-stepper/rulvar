[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / parseScopePath

# Function: parseScopePath()

```ts
function parseScopePath(path): ScopeSegment[];
```

Defined in: [packages/core/src/journal/scope.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L70)

Parses a scope path against the frozen grammar (M2-T04):

  scope-path   ::= "" | scope-path "/" segment
  segment      ::= "par:" site ":" branch
                 | "pipe:" stage ":" item
                 | "wf:" name ":" ordinal
                 | "agent:" seq
                 | "plan" ("/" NodeId follows as its own segment)
  NodeId       ::= Crockford ULID (26 chars)

Registered workflow names may contain ':' (the ordinal is the final
segment field). Throws on malformed paths.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

[`ScopeSegment`](/api/@rulvar/core/type-aliases/ScopeSegment.md)[]

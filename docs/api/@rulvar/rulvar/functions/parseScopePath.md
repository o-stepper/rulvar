[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / parseScopePath

# Function: parseScopePath()

```ts
function parseScopePath(path): ScopeSegment[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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

[`ScopeSegment`](/api/@rulvar/rulvar/type-aliases/ScopeSegment.md)[]

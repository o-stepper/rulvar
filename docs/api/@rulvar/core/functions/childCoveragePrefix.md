[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / childCoveragePrefix

# Function: childCoveragePrefix()

```ts
function childCoveragePrefix(target): string;
```

Defined in: [packages/core/src/journal/disposition.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/disposition.ts#L48)

The child scope-prefix an abandon over `target` covers transitively.
Agent spawns nest under agent:&lt;seq&gt;; a child
workflow's subtree runs under the wf:&lt;name&gt;:&lt;ordinal&gt; scope recorded in
its dispatch payload (M6-T06). A child entry without the payload
(foreign journals) degrades to the agent:&lt;seq&gt; convention, which covers
nothing real and keeps the fold total.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

`string`

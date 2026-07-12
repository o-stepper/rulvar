[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / childCoveragePrefix

# Function: childCoveragePrefix()

```ts
function childCoveragePrefix(target): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The child scope-prefix an abandon over `target` covers transitively.
Agent spawns nest under agent:&lt;seq&gt; (docs/03, section 2.2); a child
workflow's subtree runs under the wf:&lt;name&gt;:&lt;ordinal&gt; scope recorded in
its dispatch payload (M6-T06). A child entry without the payload
(foreign journals) degrades to the agent:&lt;seq&gt; convention, which covers
nothing real and keeps the fold total.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

`string`

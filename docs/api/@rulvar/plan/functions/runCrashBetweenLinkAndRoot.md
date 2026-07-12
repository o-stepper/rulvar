[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCrashBetweenLinkAndRoot

# Function: runCrashBetweenLinkAndRoot()

```ts
function runCrashBetweenLinkAndRoot(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1591](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1591)

crash-between-link-and-root (DEF-5): the full-reuse scenario is cut
strictly AFTER the durable node.link and BEFORE the by-ref root; the
resume rolls forward: the link forward-matches, the root is re-issued,
and nothing is paid twice.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

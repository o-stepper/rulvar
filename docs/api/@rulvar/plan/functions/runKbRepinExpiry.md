[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runKbRepinExpiry

# Function: runKbRepinExpiry()

```ts
function runKbRepinExpiry(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m10-cassettes.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m10-cassettes.ts#L184)

kb-repin-expiry (docs/09, 6.11): the repin re-applies the docs/05
filters against a FRESH read; a claim the store dropped between the
pin and the wake stops steering, while the boot pin's bytes stand.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

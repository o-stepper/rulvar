[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runClaimExclusivityAndChain

# Function: runClaimExclusivityAndChain()

```ts
function runClaimExclusivityAndChain(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1938](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1938)

claim-exclusivity-and-chain (DEF-5): one revision adds TWO identical
tasks; the first grafts (exclusive claim), the second admits fresh;
the grafted node is severed and the key added a third time: the link
points at the chain head and the drain is transitive, oldest first;
oscillationCount for the key reaches 2.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runOscillationFullReuse

# Function: runOscillationFullReuse()

```ts
function runOscillationFullReuse(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1391](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1391)

oscillation-full-reuse (DEF-5): a branch whose escalated-terminal root
is severed by cancel_task and re-added byte-identically links
reuse_full: the verdict is embedded in the plan.revision, the
node.link (mode full, claim shared) and the by-ref root are present,
the reused subtree costs zero live calls, and reclaimedUsdAtLink
equals the donor spend.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

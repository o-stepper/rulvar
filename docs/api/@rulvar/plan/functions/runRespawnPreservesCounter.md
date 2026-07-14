[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runRespawnPreservesCounter

# Function: runRespawnPreservesCounter()

```ts
function runRespawnPreservesCounter(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:631](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L631)

respawn-preserves-counter (DEF-3): the worker escalates, the
orchestrator respawns the SAME logical task with an amended prompt
(new content key, same LTID) twice; the third escalation exceeds
maxEscalationsPerLogicalTask, is denied on escalationUnits, and the
run closes through the non-HITL fallback with identical verdicts and
statsBefore on replay.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

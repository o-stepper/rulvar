[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / runPlannerSelfRepair

# Function: runPlannerSelfRepair()

```ts
function runPlannerSelfRepair(options): Promise<{
  engine: Engine;
  entries: JournalEntry[];
  planned: PlanResult;
}>;
```

Defined in: [packages/planner/src/cassettes.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/cassettes.ts#L100)

One planner-self-repair run: the first draft fails lint, the JSON
diagnostics ride the repair prompt, the second draft compiles. Returns
the normalized planning journal plus the plan result.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `makeAdapter`: () => `unknown`; `modelRef`: `string`; `seedEntries?`: [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]; `store?`: [`InMemoryStore`](/api/@rulvar/rulvar/classes/InMemoryStore.md); \} |
| `options.makeAdapter` | () => `unknown` |
| `options.modelRef` | `string` |
| `options.seedEntries?` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `options.store?` | [`InMemoryStore`](/api/@rulvar/rulvar/classes/InMemoryStore.md) |

## Returns

`Promise`\<\{
  `engine`: [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md);
  `entries`: [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[];
  `planned`: [`PlanResult`](/api/@rulvar/planner/interfaces/PlanResult.md);
\}\>

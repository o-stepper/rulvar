[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runRewordedLessonsCollide

# Function: runRewordedLessonsCollide()

```ts
function runRewordedLessonsCollide(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:742](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L742)

reworded-lessons-collide (DEF-3): two attempts of one LTID whose
prompts differ but whose signature inputs are identical and share the
'binary-search' tag; the engine computes equal approachSig values,
lesson_add keys once, and plan_view groups both attempts into one
approach.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

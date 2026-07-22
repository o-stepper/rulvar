[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / engineWith

# Function: engineWith()

```ts
function engineWith(
   adapter, 
   store, 
   profiles, 
   extras?): Engine;
```

Defined in: [packages/plan/src/cassettes.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L165)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `adapter` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md) | - |
| `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - |
| `profiles` | `Record`\&lt;`string`, `unknown`\&gt; | - |
| `extras?` | \{ `isolation?`: `unknown`; `knowledge?`: `unknown`; `lineage?`: `Record`\&lt;`string`, `number`\&gt;; `schemas?`: `Record`\&lt;`string`, `unknown`\&gt;; \} | - |
| `extras.isolation?` | `unknown` | - |
| `extras.knowledge?` | `unknown` | ModelKnowledge store for the M10 kb cassettes. |
| `extras.lineage?` | `Record`\&lt;`string`, `number`\&gt; | - |
| `extras.schemas?` | `Record`\&lt;`string`, `unknown`\&gt; | - |

## Returns

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)

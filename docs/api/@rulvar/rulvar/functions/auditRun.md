[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / auditRun

# Function: auditRun()

```ts
function auditRun(store, runId): Promise<RunStateAudit>;
```

Defined in: `packages/core/dist/index.d.ts`

Audits one run: loads the meta row and the journal, derives the state
the journal supports, and names the divergence. Read only.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `runId` | `string` |

## Returns

`Promise`\&lt;[`RunStateAudit`](/api/@rulvar/rulvar/interfaces/RunStateAudit.md)\&gt;

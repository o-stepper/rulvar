[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / auditRun

# Function: auditRun()

```ts
function auditRun(store, runId): Promise<RunStateAudit>;
```

Defined in: [packages/core/src/stores/reconcile.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L106)

Audits one run: loads the meta row and the journal, derives the state
the journal supports, and names the divergence. Read only.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |
| `runId` | `string` |

## Returns

`Promise`\&lt;[`RunStateAudit`](/api/@rulvar/core/interfaces/RunStateAudit.md)\&gt;

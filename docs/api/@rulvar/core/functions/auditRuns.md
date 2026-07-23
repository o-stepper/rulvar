[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / auditRuns

# Function: auditRuns()

```ts
function auditRuns(store, opts?): Promise<RunStateAudit[]>;
```

Defined in: [packages/core/src/stores/reconcile.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L219)

Audits every run the catalog lists. Loads EVERY journal it audits:
this is operator tooling for finding stranded runs, not a hot path.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |
| `opts?` | [`AuditRunsOptions`](/api/@rulvar/core/interfaces/AuditRunsOptions.md) |

## Returns

`Promise`\&lt;[`RunStateAudit`](/api/@rulvar/core/interfaces/RunStateAudit.md)[]\&gt;

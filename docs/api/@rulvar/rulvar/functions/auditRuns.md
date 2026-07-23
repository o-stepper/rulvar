[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / auditRuns

# Function: auditRuns()

```ts
function auditRuns(store, opts?): Promise<RunStateAudit[]>;
```

Defined in: `packages/core/dist/index.d.ts`

Audits every run the catalog lists. Loads EVERY journal it audits:
this is operator tooling for finding stranded runs, not a hot path.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `opts?` | [`AuditRunsOptions`](/api/@rulvar/rulvar/interfaces/AuditRunsOptions.md) |

## Returns

`Promise`\&lt;[`RunStateAudit`](/api/@rulvar/rulvar/interfaces/RunStateAudit.md)[]\&gt;

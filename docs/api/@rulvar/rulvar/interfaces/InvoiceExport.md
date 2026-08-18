[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvoiceExport

# Interface: InvoiceExport

Defined in: `packages/core/dist/index.d.ts`

The machine-readable invoice: rows plus the ledger totals.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. | `packages/core/dist/index.d.ts` |
| <a id="property-cardinality"></a> `cardinality` | [`InvoiceCardinality`](/api/@rulvar/rulvar/interfaces/InvoiceCardinality.md) | Dispatch rows against the provider requests they represent (RV1210). | `packages/core/dist/index.d.ts` |
| <a id="property-executionscope"></a> `executionScope?` | \{ `account?`: `string`; `project?`: `string`; `tenant?`: `string`; \} | The run's bounded execution scope (RV4007), lifted from the genesis `execution_scope` decision: who this run executed for, as the host named it, on the money document a FinOps pipeline actually consumes. Absent on unscoped runs, so their exports keep their bytes. | `packages/core/dist/index.d.ts` |
| `executionScope.account?` | `string` | - | `packages/core/dist/index.d.ts` |
| `executionScope.project?` | `string` | - | `packages/core/dist/index.d.ts` |
| `executionScope.tenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-netusd"></a> `netUsd` | `number` | The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-orphanedreceipts"></a> `orphanedReceipts?` | \{ `rows`: \{ `agentRef`: `number`; `attempt`: `number`; `ordinal`: `number`; `outcome`: `string`; `responseId?`: `string`; `role`: `string`; `scope`: `string`; `servedBy`: `` `${string}:${string}` ``; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd?`: `number`; \}[]; `usd`: `number`; `wireRequests`: `number`; \} | The orphaned receipt lane (RV3405): incremental provider-call rows of agents whose TERMINAL entry does not cover them. The window is real: the loop journals a receipt as each wire settles (RV2008), the turn checkpoint lands later, and a crash between the two resumes from a checkpoint that never saw the paid wire, so the settled terminal's record set forgets the payment while the receipt lane remembers it. Real money, priced and summed apart from the settled totals exactly like `unsettled` (run_settle stays the billing boundary); this lane is why a provider statement billing that wire is explainable to the cent instead of reading as a foreign row. Coverage is decided by response id when either side carries one, else by the full (ordinal, servedBy, attempt, outcome) coordinate plus byte equal usage: after a resume the redispatched wire REUSES the ordinal, and reading the replacement as the orphan would silently absorb the double payment the resume honestly made. Present only when such rows exist; a journal without a mid turn crash never carries it. | `packages/core/dist/index.d.ts` |
| `orphanedReceipts.rows` | \{ `agentRef`: `number`; `attempt`: `number`; `ordinal`: `number`; `outcome`: `string`; `responseId?`: `string`; `role`: `string`; `scope`: `string`; `servedBy`: `` `${string}:${string}` ``; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd?`: `number`; \}[] | - | `packages/core/dist/index.d.ts` |
| `orphanedReceipts.usd` | `number` | - | `packages/core/dist/index.d.ts` |
| `orphanedReceipts.wireRequests` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-pricing"></a> `pricing?` | [`InvoicePricingProvenance`](/api/@rulvar/rulvar/interfaces/InvoicePricingProvenance.md) | The rates provenance (RV407); present when the caller declared it. | `packages/core/dist/index.d.ts` |
| <a id="property-pricingbasis"></a> `pricingBasis` | `"per-call"` | How per-row `usd` was computed: each call priced individually at the current table's rates. Always `'per-call'` today; declared so finance tooling never has to guess the basis. | `packages/core/dist/index.d.ts` |
| <a id="property-reconciliationfailures"></a> `reconciliationFailures` | `number` | Rows whose reconciliation is not 'provider-id-present'. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-rowusdnonadditive"></a> `rowUsdNonAdditive` | `boolean` | False exactly when every contributing entry's providerCalls fully cover its usage (RV504): the totals are then the per-call fold itself, each row's `usd` agrees with its `allocatedUsd`, and the flat `usd` sum reproduces `totalUsd` up to IEEE association of the last bits. True when any entry folded on the aggregate basis (no records, or records that do not cover its usage): a nonlinear price table then prices an aggregate differently from the sum of its parts, so sum `allocatedUsd` instead; it exists precisely so a column sums to the total exactly in every case. | `packages/core/dist/index.d.ts` |
| <a id="property-totalusd"></a> `totalUsd` | `number` | Every priced terminal slice, abandonment included: equals CostReport.grossUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-unallocatedusd"></a> `unallocatedUsd?` | `number` | USD of allocation pools that had a target and no row to carry it (RV605). The dust pass refuses to move such dollars onto another model's rows just to make the column sum, so on the (pathological) journals where this happens the flat `allocatedUsd` sum reproduces `totalUsd` minus this amount. Absent when zero, which is every well-formed journal: the per-slice remainder rows guarantee a row wherever a slice has usage. | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}[] | Usage on models absent from pricing, net and abandoned alike; never a silent zero. | `packages/core/dist/index.d.ts` |
| <a id="property-unsettled"></a> `unsettled?` | \{ `rows`: \{ `agentRef`: `number`; `attempt`: `number`; `ordinal`: `number`; `outcome`: `string`; `responseId?`: `string`; `role`: `string`; `scope`: `string`; `servedBy`: `` `${string}:${string}` ``; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd?`: `number`; \}[]; `usd`: `number`; `wireRequests`: `number`; \} | The unsettled lane (RV2008): dispatches whose agent is still RUNNING at the journal's edge, recovered from the incremental provider-call rows the loop journals as each wire call settles. Deliberately OUTSIDE the settled totals above: run_settle stays the billing boundary, and this section prices what the crash window preserved anyway, the ~$0.99 of parity root dispatches that used to live only in process memory. Present only when such rows exist; a journal whose roster is closed never carries it. | `packages/core/dist/index.d.ts` |
| `unsettled.rows` | \{ `agentRef`: `number`; `attempt`: `number`; `ordinal`: `number`; `outcome`: `string`; `responseId?`: `string`; `role`: `string`; `scope`: `string`; `servedBy`: `` `${string}:${string}` ``; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd?`: `number`; \}[] | - | `packages/core/dist/index.d.ts` |
| `unsettled.usd` | `number` | - | `packages/core/dist/index.d.ts` |
| `unsettled.wireRequests` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any contributing entry carried approximate usage. | `packages/core/dist/index.d.ts` |
| <a id="property-usageunknownrows"></a> `usageUnknownRows?` | `number` | Rows carrying `usageUnknown`; present when at least one does. | `packages/core/dist/index.d.ts` |

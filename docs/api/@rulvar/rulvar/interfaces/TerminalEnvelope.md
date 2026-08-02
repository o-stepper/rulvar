[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminalEnvelope

# Interface: TerminalEnvelope

Defined in: `packages/core/dist/index.d.ts`

One run terminal, the same on every surface (RV1105).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agentsspawned"></a> `agentsSpawned` | `number` | Agents admitted over the run's lifetime, resume seed included. | `packages/core/dist/index.d.ts` |
| <a id="property-completion"></a> `completion?` | `"partial"` \| `"rejected"` \| `"complete"` | The semantic completion claim, when the workflow made one. | `packages/core/dist/index.d.ts` |
| <a id="property-costbasis"></a> `costBasis` | `"locally-estimated"` | Where the dollars above come from (RV1413): journaled usage priced at the CALLER'S pricing table (declared rates or adapter caps), never a provider statement. Always `'locally-estimated'` today, declared as a literal so finance tooling never has to guess, mirroring `InvoiceExport.pricingBasis`; reconcile real bills through the invoice export and `reconcileStatement`, which carry their own provenance. | `packages/core/dist/index.d.ts` |
| <a id="property-costbymodel"></a> `costByModel` | `Record`\&lt;`string`, `number`\&gt; | The per-model split of totalUsd, keyed by canonical ModelRef. | `packages/core/dist/index.d.ts` |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | The typed error, exactly the outcome's, when status is 'error'. | `packages/core/dist/index.d.ts` |
| <a id="property-grossusd"></a> `grossUsd` | `number` | The gross figure with abandoned subtrees included (P1.3). | `packages/core/dist/index.d.ts` |
| <a id="property-provenance"></a> `provenance?` | `"journal"` | Where THIS copy of the envelope was assembled (RV1209). Absent, the historical byte contract, means the settlement chokepoint built it from the live outcome, so every field above is the run's own report. `'journal'` means a process that never held the run rebuilt it from the journal that recorded the settle (a restart, a second replica, an offline reader): the money, the usage, the agent count and the settlement verdict are the SAME facts, but `completion` and `error` are ABSENT because the journal does not record them, and absence there means "not recorded", never "the workflow claimed nothing" or "the run did not fail". A consumer that needs those two reads them from the live outcome or the run:end event. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | The run this terminal speaks for. | `packages/core/dist/index.d.ts` |
| <a id="property-settled"></a> `settled` | `boolean` | Whether anything durable records this terminal (RV907). False only on the event stream: `handle.result` rejects typed instead of resolving an unsettled outcome. | `packages/core/dist/index.d.ts` |
| <a id="property-settledreason"></a> `settledReason?` | `"superseded"` | Present only beside `settled: false` when a successor owns settlement (RV1009). | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | The computed transport status of the run. | `packages/core/dist/index.d.ts` |
| <a id="property-totalusd"></a> `totalUsd` | `number` | The NET settled fold: what the run recorded as spent. | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | The run's usage aggregate, TTL attribution included. | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox` | `boolean` | True when any priced usage is approximate: totalUsd is a lower bound. | `packages/core/dist/index.d.ts` |
| <a id="property-workflow"></a> `workflow` | `string` | The workflow name the run was started (or resumed) under. | `packages/core/dist/index.d.ts` |

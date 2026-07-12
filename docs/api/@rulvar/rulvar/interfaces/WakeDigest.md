[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WakeDigest

# Interface: WakeDigest

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The FINAL normative WakeDigest (docs/07 section 5): one coordinated
schema change inside the hashVersion-2 profile (XF-12). The digest
render enters the content key of orchestrator turns. In runs without
the PlanRunner extension the termination, budget, and reuse blocks are
all-zero and planHash is empty, mirroring the CostReport convention.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget` | [`WakeBudgetBlock`](/api/@rulvar/rulvar/interfaces/WakeBudgetBlock.md) | Mandatory (DEF-7). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-completeddigests"></a> `completedDigests` | [`TaskDigest`](/api/@rulvar/rulvar/interfaces/TaskDigest.md)[] | Ordered by spawn ordinal, never wall-clock (coalescing rule). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-coverstoordinal"></a> `coversToOrdinal` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-digestseq"></a> `digestSeq` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-escalations"></a> `escalations` | [`EscalationDigest`](/api/@rulvar/rulvar/interfaces/EscalationDigest.md)[] | Pending and newly decided reports. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-planhash"></a> `planHash` | `string` | Plan hash at emission time ('' outside PlanRunner). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-reuse"></a> `reuse` | \{ `abandonedUsd`: `number`; `byKey?`: `Record`\&lt;`string`, \{ `abandonedUsd`: `number`; `reclaimedUsd`: `number`; \}\&gt;; `netLostUsd`: `number`; `reclaimedUsd`: `number`; \} | Reuse and oscillation stats (DEF-5): the AbandonedSpendView shape. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `reuse.abandonedUsd` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `reuse.byKey?` | `Record`\&lt;`string`, \{ `abandonedUsd`: `number`; `reclaimedUsd`: `number`; \}\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `reuse.netLostUsd` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `reuse.reclaimedUsd` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-termination"></a> `termination` | \{ `perLineage`: `Record`\&lt;`string`, \{ `escalationUnitsRemaining`: `number`; `rungsRemaining`: `number`; \}\&gt;; `phi`: `number`; `revisionUnitsRemaining`: `number`; `spawnUnitsRemaining`: `number`; \} | Mandatory (DEF-2). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `termination.perLineage` | `Record`\&lt;`string`, \{ `escalationUnitsRemaining`: `number`; `rungsRemaining`: `number`; \}\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `termination.phi` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `termination.revisionUnitsRemaining` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `termination.spawnUnitsRemaining` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

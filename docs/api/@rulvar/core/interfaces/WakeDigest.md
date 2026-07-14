[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WakeDigest

# Interface: WakeDigest

Defined in: [packages/core/src/orchestrator/wake.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L109)

The FINAL normative WakeDigest: one coordinated
schema change inside the hashVersion-2 profile (XF-12). The digest
render enters the content key of orchestrator turns. In runs without
the PlanRunner extension the termination, budget, and reuse blocks are
all-zero and planHash is empty, mirroring the CostReport convention.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budget"></a> `budget` | [`WakeBudgetBlock`](/api/@rulvar/core/interfaces/WakeBudgetBlock.md) | Mandatory (DEF-7). | [packages/core/src/orchestrator/wake.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L126) |
| <a id="property-completeddigests"></a> `completedDigests` | [`TaskDigest`](/api/@rulvar/core/interfaces/TaskDigest.md)[] | Ordered by spawn ordinal, never wall-clock (coalescing rule). | [packages/core/src/orchestrator/wake.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L115) |
| <a id="property-coverstoordinal"></a> `coversToOrdinal` | `number` | - | [packages/core/src/orchestrator/wake.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L113) |
| <a id="property-digestseq"></a> `digestSeq` | `number` | - | [packages/core/src/orchestrator/wake.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L110) |
| <a id="property-escalations"></a> `escalations` | [`EscalationDigest`](/api/@rulvar/core/interfaces/EscalationDigest.md)[] | Pending and newly decided reports. | [packages/core/src/orchestrator/wake.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L117) |
| <a id="property-planhash"></a> `planHash` | `string` | Plan hash at emission time ('' outside PlanRunner). | [packages/core/src/orchestrator/wake.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L112) |
| <a id="property-reuse"></a> `reuse` | \{ `abandonedUsd`: `number`; `byKey?`: `Record`\&lt;`string`, \{ `abandonedUsd`: `number`; `reclaimedUsd`: `number`; \}\&gt;; `netLostUsd`: `number`; `reclaimedUsd`: `number`; \} | Reuse and oscillation stats (DEF-5): the AbandonedSpendView shape. | [packages/core/src/orchestrator/wake.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L128) |
| `reuse.abandonedUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L129) |
| `reuse.byKey?` | `Record`\&lt;`string`, \{ `abandonedUsd`: `number`; `reclaimedUsd`: `number`; \}\&gt; | Per-SpawnKey rows (present under PlanRunner). | [packages/core/src/orchestrator/wake.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L133) |
| `reuse.netLostUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L131) |
| `reuse.reclaimedUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L130) |
| <a id="property-termination"></a> `termination` | \{ `perLineage`: `Record`\&lt;`string`, \{ `escalationUnitsRemaining`: `number`; `rungsRemaining`: `number`; \}\&gt;; `phi`: `number`; `revisionUnitsRemaining`: `number`; `spawnUnitsRemaining`: `number`; \} | Mandatory (DEF-2). | [packages/core/src/orchestrator/wake.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L119) |
| `termination.perLineage` | `Record`\&lt;`string`, \{ `escalationUnitsRemaining`: `number`; `rungsRemaining`: `number`; \}\&gt; | - | [packages/core/src/orchestrator/wake.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L122) |
| `termination.phi` | `number` | - | [packages/core/src/orchestrator/wake.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L123) |
| `termination.revisionUnitsRemaining` | `number` | - | [packages/core/src/orchestrator/wake.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L120) |
| `termination.spawnUnitsRemaining` | `number` | - | [packages/core/src/orchestrator/wake.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L121) |

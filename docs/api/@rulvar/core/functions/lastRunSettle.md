[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / lastRunSettle

# Function: lastRunSettle()

```ts
function lastRunSettle(entries): 
  | {
  acceptedArtifactRef?: number;
  citationAuditMeta?: Record<string, unknown>;
  claimConsistencyMeta?: Record<string, unknown>;
  completion?: "complete" | "partial" | "rejected";
  deliverableAccepted?: boolean;
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  resultAvailable?: boolean;
  runStatus: RunStatus;
  semanticTerminalVerdict?: Record<string, unknown>;
  seq: number;
}
  | undefined;
```

Defined in: [packages/core/src/stores/reconcile.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L62)

The last journaled run settle of a journal, if any. `outputHash` is
present when that settle recorded the result digest (RV-209; settles
written before it, or over undefined/non-serializable results, carry
none).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

### Type Literal

```ts
{
  acceptedArtifactRef?: number;
  citationAuditMeta?: Record<string, unknown>;
  claimConsistencyMeta?: Record<string, unknown>;
  completion?: "complete" | "partial" | "rejected";
  deliverableAccepted?: boolean;
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  resultAvailable?: boolean;
  runStatus: RunStatus;
  semanticTerminalVerdict?: Record<string, unknown>;
  seq: number;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `acceptedArtifactRef?` | `number` | - | [packages/core/src/stores/reconcile.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L87) |
| `citationAuditMeta?` | `Record`\&lt;`string`, `unknown`\&gt; | The citation audit meta and the one-word semantic verdict the settle recorded (RV4403), read back the same defensive way: the seventh comparison run's restart reader could not see the ten unsupported citations its own failure named. Absence means NOT RECORDED, never a verdict. | [packages/core/src/stores/reconcile.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L96) |
| `claimConsistencyMeta?` | `Record`\&lt;`string`, `unknown`\&gt; | - | [packages/core/src/stores/reconcile.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L88) |
| `completion?` | `"complete"` \| `"partial"` \| `"rejected"` | - | [packages/core/src/stores/reconcile.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L67) |
| `deliverableAccepted?` | `boolean` | The semantic outcome the settle recorded (RV3304), read back the same defensive way: the acceptance verdict, the deliverable presence, the acceptance ref and the judge meta, so a restarted reader recovers the facts a live consumer gated on. Absent on journals written before the lift carried them; absence means NOT RECORDED, never a verdict. | [packages/core/src/stores/reconcile.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L85) |
| `outputHash?` | `string` | - | [packages/core/src/stores/reconcile.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L66) |
| `rejectedFinishCandidates?` | [`RejectedFinishCandidate`](/api/@rulvar/core/interfaces/RejectedFinishCandidate.md)[] | The rejected finish candidates the settle recorded (RV2507), read back for offline readers (RV2605). The settle persists the whole completion lift, so this needs no re-fold and no validator re-run; it is parsed defensively, exactly like `completion`, so a foreign or older journal reads as "not recorded" rather than as a claim. | [packages/core/src/stores/reconcile.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L76) |
| `resultAvailable?` | `boolean` | - | [packages/core/src/stores/reconcile.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L86) |
| `runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L64) |
| `semanticTerminalVerdict?` | `Record`\&lt;`string`, `unknown`\&gt; | - | [packages/core/src/stores/reconcile.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L97) |
| `seq` | `number` | - | [packages/core/src/stores/reconcile.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L65) |

***

`undefined`

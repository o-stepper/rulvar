[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / lastRunSettle

# Function: lastRunSettle()

```ts
function lastRunSettle(entries): 
  | {
  acceptedArtifactRef?: number;
  claimConsistencyMeta?: Record<string, unknown>;
  completion?: "partial" | "rejected" | "complete";
  deliverableAccepted?: boolean;
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  resultAvailable?: boolean;
  runStatus: RunStatus;
  seq: number;
}
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The last journaled run settle of a journal, if any. `outputHash` is
present when that settle recorded the result digest (RV-209; settles
written before it, or over undefined/non-serializable results, carry
none).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

### Type Literal

```ts
{
  acceptedArtifactRef?: number;
  claimConsistencyMeta?: Record<string, unknown>;
  completion?: "partial" | "rejected" | "complete";
  deliverableAccepted?: boolean;
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  resultAvailable?: boolean;
  runStatus: RunStatus;
  seq: number;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `acceptedArtifactRef?` | `number` | - | `packages/core/dist/index.d.ts` |
| `claimConsistencyMeta?` | `Record`\&lt;`string`, `unknown`\&gt; | - | `packages/core/dist/index.d.ts` |
| `completion?` | `"partial"` \| `"rejected"` \| `"complete"` | - | `packages/core/dist/index.d.ts` |
| `deliverableAccepted?` | `boolean` | The semantic outcome the settle recorded (RV3304), read back the same defensive way: the acceptance verdict, the deliverable presence, the acceptance ref and the judge meta, so a restarted reader recovers the facts a live consumer gated on. Absent on journals written before the lift carried them; absence means NOT RECORDED, never a verdict. | `packages/core/dist/index.d.ts` |
| `outputHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| `rejectedFinishCandidates?` | [`RejectedFinishCandidate`](/api/@rulvar/rulvar/interfaces/RejectedFinishCandidate.md)[] | The rejected finish candidates the settle recorded (RV2507), read back for offline readers (RV2605). The settle persists the whole completion lift, so this needs no re-fold and no validator re-run; it is parsed defensively, exactly like `completion`, so a foreign or older journal reads as "not recorded" rather than as a claim. | `packages/core/dist/index.d.ts` |
| `resultAvailable?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `runStatus` | [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md) | - | `packages/core/dist/index.d.ts` |
| `seq` | `number` | - | `packages/core/dist/index.d.ts` |

***

`undefined`

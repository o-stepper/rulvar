[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / lastRunSettle

# Function: lastRunSettle()

```ts
function lastRunSettle(entries): 
  | {
  completion?: "complete" | "partial" | "rejected";
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  runStatus: RunStatus;
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
  completion?: "complete" | "partial" | "rejected";
  outputHash?: string;
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  runStatus: RunStatus;
  seq: number;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `completion?` | `"complete"` \| `"partial"` \| `"rejected"` | - | [packages/core/src/stores/reconcile.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L67) |
| `outputHash?` | `string` | - | [packages/core/src/stores/reconcile.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L66) |
| `rejectedFinishCandidates?` | [`RejectedFinishCandidate`](/api/@rulvar/core/interfaces/RejectedFinishCandidate.md)[] | The rejected finish candidates the settle recorded (RV2507), read back for offline readers (RV2605). The settle persists the whole completion lift, so this needs no re-fold and no validator re-run; it is parsed defensively, exactly like `completion`, so a foreign or older journal reads as "not recorded" rather than as a claim. | [packages/core/src/stores/reconcile.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L76) |
| `runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L64) |
| `seq` | `number` | - | [packages/core/src/stores/reconcile.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L65) |

***

`undefined`

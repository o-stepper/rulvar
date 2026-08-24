[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / readApprovalRevoked

# Function: readApprovalRevoked()

```ts
function readApprovalRevoked(entry): 
  | {
  targetRef: number;
}
  | undefined;
```

Defined in: [packages/core/src/effects/types.ts:499](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L499)

Reads one journal entry as the shipped `approval_revoked` decision
(RV4008), by the exact shape ExternalRegistry.revokeApproval appends.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

  \| \{
  `targetRef`: `number`;
\}
  \| `undefined`

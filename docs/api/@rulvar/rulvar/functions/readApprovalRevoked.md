[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / readApprovalRevoked

# Function: readApprovalRevoked()

```ts
function readApprovalRevoked(entry): 
  | {
  targetRef: number;
}
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Reads one journal entry as the shipped `approval_revoked` decision
(RV4008), by the exact shape ExternalRegistry.revokeApproval appends.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

  \| \{
  `targetRef`: `number`;
\}
  \| `undefined`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / readApprovalExpired

# Function: readApprovalExpired()

```ts
function readApprovalExpired(entry): 
  | {
  expiresAt: string;
  targetRef: number;
}
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Reads one journal entry as an `approval_expired` decision (the clock
fact of RFC section 4.5), fail closed like the lane reader.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

  \| \{
  `expiresAt`: `string`;
  `targetRef`: `number`;
\}
  \| `undefined`

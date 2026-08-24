[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / readApprovalExpired

# Function: readApprovalExpired()

```ts
function readApprovalExpired(entry): 
  | {
  expiresAt: string;
  targetRef: number;
}
  | undefined;
```

Defined in: [packages/core/src/effects/types.ts:478](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L478)

Reads one journal entry as an `approval_expired` decision (the clock
fact of RFC section 4.5), fail closed like the lane reader.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

  \| \{
  `expiresAt`: `string`;
  `targetRef`: `number`;
\}
  \| `undefined`

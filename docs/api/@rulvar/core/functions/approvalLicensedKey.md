[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / approvalLicensedKey

# Function: approvalLicensedKey()

```ts
function approvalLicensedKey(entry): string | undefined;
```

Defined in: [packages/core/src/effects/types.ts:579](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L579)

The effect logical key an approval licenses (RFC section 4.3, item
4), read from the approval suspension's own payload: recorded on the
approval request, so the fold can refuse an intent whose key differs
from the key the approval named. Fail closed: an approval that names
no key licenses no effect.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

`string` \| `undefined`

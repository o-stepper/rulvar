[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / ensure

# Function: ensure()

```ts
function ensure(
   condition, 
   checkId, 
   message): asserts condition;
```

Defined in: [packages/store-conformance/src/types.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L56)

Assertion helper: conformance failures are plain Errors naming the check.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `condition` | `boolean` |
| `checkId` | `string` |
| `message` | `string` |

## Returns

`asserts condition`

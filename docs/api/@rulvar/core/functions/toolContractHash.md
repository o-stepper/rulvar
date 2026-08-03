[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolContractHash

# Function: toolContractHash()

```ts
function toolContractHash(contract): string;
```

Defined in: [packages/core/src/l0/schema.ts:380](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L380)

toolContractHash = sha256 over the JCS-canonical tuple of ONE tool
contract: exactly one element of toolsetHash's array, so a per-tool
hash identifies WHICH contract drifted when an attested toolsetHash
stops matching (RV1514). Same tuple rule as the aggregate: the
description is part of the contract, and an absent version
participates as absent.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `contract` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md) |

## Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toolContractHash

# Function: toolContractHash()

```ts
function toolContractHash(contract): string;
```

Defined in: `packages/core/dist/index.d.ts`

toolContractHash = sha256 over the JCS-canonical tuple of ONE tool
contract: exactly one element of toolsetHash's array, so a per-tool
hash identifies WHICH contract drifted when an attested toolsetHash
stops matching (RV1514). Same tuple rule as the aggregate: the
description is part of the contract, and an absent version
participates as absent.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `contract` | [`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md) |

## Returns

`string`

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolsetHash

# Function: toolsetHash()

```ts
function toolsetHash(contracts): string;
```

Defined in: [packages/core/src/l0/schema.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L353)

toolsetHash = sha256 over the JCS-canonical JSON array of per-tool
contract tuples (name, description, canonical parameters, version)
sorted by name. Tool description IS part of the contract; schema
annotations inside parameters are not. An absent version participates as
absent.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] |

## Returns

`string`

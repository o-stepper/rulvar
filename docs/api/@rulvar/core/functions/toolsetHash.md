[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolsetHash

# Function: toolsetHash()

```ts
function toolsetHash(contracts): string;
```

Defined in: [packages/core/src/l0/schema.ts:360](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L360)

toolsetHash = sha256 over the JCS-canonical JSON array of per-tool
contract tuples (name, description, canonical parameters, version)
sorted by name. Tool description IS part of the contract; schema
annotations inside parameters are not. An absent version participates as
absent (docs/03, section "schemaHash and toolsetHash derivation";
docs/08, section "toolsetHash contract").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] |

## Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolsetAuthorityHash

# Function: toolsetAuthorityHash()

```ts
function toolsetAuthorityHash(authorities): string;
```

Defined in: [packages/core/src/tools/toolset-hash.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L86)

The aggregate authority hash (RV1802): sha256 over the JCS-canonical
array of per-tool authority records, each carrying its tool name,
sorted by name; toolsetHash's exact aggregation shape, over the
authority side.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `authorities` | `Record`\&lt;`string`, [`ToolAuthority`](/api/@rulvar/core/interfaces/ToolAuthority.md)\&gt; |

## Returns

`string`

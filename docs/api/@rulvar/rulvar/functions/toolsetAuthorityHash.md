[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toolsetAuthorityHash

# Function: toolsetAuthorityHash()

```ts
function toolsetAuthorityHash(authorities): string;
```

Defined in: `packages/core/dist/index.d.ts`

The aggregate authority hash (RV1802): sha256 over the JCS-canonical
array of per-tool authority records, each carrying its tool name,
sorted by name; toolsetHash's exact aggregation shape, over the
authority side.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `authorities` | `Record`\&lt;`string`, [`ToolAuthority`](/api/@rulvar/rulvar/interfaces/ToolAuthority.md)\&gt; |

## Returns

`string`

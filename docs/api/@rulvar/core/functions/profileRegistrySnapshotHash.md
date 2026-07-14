[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / profileRegistrySnapshotHash

# Function: profileRegistrySnapshotHash()

```ts
function profileRegistrySnapshotHash(profiles): string;
```

Defined in: [packages/core/src/journal/termination.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L128)

The deterministic profile-registry snapshot hash frozen inside
termination.init: profile names mapped to their declared ladder
lengths, canonical JSON, sha256.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

`string`

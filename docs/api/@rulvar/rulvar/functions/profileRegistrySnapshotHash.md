[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / profileRegistrySnapshotHash

# Function: profileRegistrySnapshotHash()

```ts
function profileRegistrySnapshotHash(profiles): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The deterministic profile-registry snapshot hash frozen inside
termination.init: profile names mapped to their declared ladder
lengths, canonical JSON, sha256 (docs/07, 11.6).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

`string`

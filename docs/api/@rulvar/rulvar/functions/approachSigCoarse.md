[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / approachSigCoarse

# Function: approachSigCoarse()

```ts
function approachSigCoarse(inputs): string;
```

Defined in: `packages/core/dist/index.d.ts`

approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash,
schemaHash, isolation })). Feeds the stall detector and the oscillation
guard, which keys ACROSS LTID boundaries.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inputs` | [`ApproachSignatureInputs`](/api/@rulvar/rulvar/interfaces/ApproachSignatureInputs.md) |

## Returns

`string`

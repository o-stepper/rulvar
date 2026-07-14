[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / approachSigCoarse

# Function: approachSigCoarse()

```ts
function approachSigCoarse(inputs): string;
```

Defined in: [packages/core/src/journal/lineage.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L196)

approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash,
schemaHash, isolation })). Feeds the stall detector and the oscillation
guard, which keys ACROSS LTID boundaries.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inputs` | [`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md) |

## Returns

`string`

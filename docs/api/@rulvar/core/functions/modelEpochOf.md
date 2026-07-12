[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / modelEpochOf

# Function: modelEpochOf()

```ts
function modelEpochOf(inputs): 
  | {
  canaryFingerprint?: string;
  capsHash?: string;
  pricingVersion?: string;
  registryVersion?: string;
}
  | undefined;
```

Defined in: [packages/core/src/knowledge/epoch.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/epoch.ts#L32)

Builds the optional modelEpoch block; empty inputs give undefined.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inputs` | [`ModelEpochInputs`](/api/@rulvar/core/interfaces/ModelEpochInputs.md) |

## Returns

  \| \{
  `canaryFingerprint?`: `string`;
  `capsHash?`: `string`;
  `pricingVersion?`: `string`;
  `registryVersion?`: `string`;
\}
  \| `undefined`

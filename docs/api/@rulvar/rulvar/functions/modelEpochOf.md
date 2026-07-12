[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / modelEpochOf

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

Defined in: `packages/core/dist/index.d.ts`

Builds the optional modelEpoch block; empty inputs give undefined.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `inputs` | [`ModelEpochInputs`](/api/@rulvar/rulvar/interfaces/ModelEpochInputs.md) |

## Returns

  \| \{
  `canaryFingerprint?`: `string`;
  `capsHash?`: `string`;
  `pricingVersion?`: `string`;
  `registryVersion?`: `string`;
\}
  \| `undefined`

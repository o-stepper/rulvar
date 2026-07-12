[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / registryKeyRing

# Function: registryKeyRing()

```ts
function registryKeyRing(registry): KeyRing;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

KeyRing over the registry: the live call is projected DOWN into the
profile of the stored entry; there is no upward canonization (docs/03,
section 4.7).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `registry` | [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md) |

## Returns

[`KeyRing`](/api/@rulvar/rulvar/interfaces/KeyRing.md)

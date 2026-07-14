[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / registryKeyRing

# Function: registryKeyRing()

```ts
function registryKeyRing(registry): KeyRing;
```

Defined in: [packages/core/src/journal/keyderiver.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L213)

KeyRing over the registry: the live call is projected DOWN into the
profile of the stored entry; there is no upward canonization.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `registry` | [`DeriverRegistry`](/api/@rulvar/core/type-aliases/DeriverRegistry.md) |

## Returns

[`KeyRing`](/api/@rulvar/core/interfaces/KeyRing.md)

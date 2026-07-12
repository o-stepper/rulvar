[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / registerConformance

# Function: registerConformance()

```ts
function registerConformance(suite, api): void;
```

Defined in: [packages/store-conformance/src/types.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L36)

Registers the suite as one `describe` block with one `it` per check.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `suite` | [`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md) |
| `api` | [`TestRegistrar`](/api/@rulvar/store-conformance/interfaces/TestRegistrar.md) |

## Returns

`void`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / makeSuite

# Function: makeSuite()

```ts
function makeSuite(name, checks): ConformanceSuite;
```

Defined in: [packages/store-conformance/src/types.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L43)

@rulvar/store-conformance: the executable store conformance kit
(M2-T11, DEF-4). A store implementation passes journalStoreConformance
(and leasableStoreConformance when it has the lease capability) or it
is not a Rulvar store; the kit is the executable definition of the
storage seam frozen at 1.0.

Usage under Vitest:

  const suite = journalStoreConformance(() => new MyStore());
  registerConformance(suite, { describe, it });

Public docs: https://docs.rulvar.com/guide/stores (conformance
obligations) and https://docs.rulvar.com/guide/testing (conformance tier).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `checks` | readonly [`ConformanceCheck`](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md)[] |

## Returns

[`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md)

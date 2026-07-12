[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / makeSuite

# Function: makeSuite()

```ts
function makeSuite(name, checks): ConformanceSuite;
```

Defined in: [packages/store-conformance/src/types.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L44)

@rulvar/store-conformance: the executable store conformance kit
(M2-T11, DEF-4). A store implementation passes journalStoreConformance
(and leasableStoreConformance when it has the lease capability) or it
is not a rulvar store; the kit is the executable definition of the
storage seam frozen at 1.0 (docs/02, section "Compatibility policy").

Usage under Vitest:

  const suite = journalStoreConformance(() => new MyStore());
  registerConformance(suite, { describe, it });

Owning specs: docs/03, section "Conformance obligations"; docs/11,
section "Conformance tier".

## Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `checks` | readonly [`ConformanceCheck`](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md)[] |

## Returns

[`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md)

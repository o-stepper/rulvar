[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / ConformanceSuite

# Interface: ConformanceSuite

Defined in: [packages/store-conformance/src/types.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L14)

@rulvar/store-conformance: the executable store conformance kit
(M2-T11, DEF-4). A store implementation passes journalStoreConformance
(and leasableStoreConformance when it has the lease capability,
fencedWritesConformance when it declares the fencedWrites promise, and
fencedTranscriptsConformance when its transcript store declares the
same promise) or it is not a Rulvar store; the kit is the executable
definition of the storage seam frozen at 1.0. Stores meant for
multi-process queue deployments additionally run the adversarial
multi-process soak (runMultiProcessSoak: real OS processes storm one
store location through every fenced write surface and the referee
diffs the state against the serial history the epochs promise).

Usage under Vitest:

  const suite = journalStoreConformance(() => new MyStore());
  registerConformance(suite, { describe, it });

Public docs: https://docs.rulvar.com/guide/stores (conformance
obligations) and https://docs.rulvar.com/guide/testing (conformance tier).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-checks"></a> `checks` | readonly [`ConformanceCheck`](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md)[] | [packages/store-conformance/src/types.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L16) |
| <a id="property-name"></a> `name` | `string` | [packages/store-conformance/src/types.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L15) |

## Methods

### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/store-conformance/src/types.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L18)

Runs every check sequentially; throws on the first violation.

#### Returns

`Promise`\&lt;`void`\&gt;

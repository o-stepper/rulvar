[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / ConformanceSuite

# Interface: ConformanceSuite

Defined in: [packages/store-conformance/src/types.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L15)

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

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-checks"></a> `checks` | readonly [`ConformanceCheck`](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md)[] | [packages/store-conformance/src/types.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L17) |
| <a id="property-name"></a> `name` | `string` | [packages/store-conformance/src/types.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L16) |

## Methods

### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/store-conformance/src/types.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L19)

Runs every check sequentially; throws on the first violation.

#### Returns

`Promise`\&lt;`void`\&gt;

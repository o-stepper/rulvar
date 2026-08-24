[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / AdmissionConformanceOptions

# Interface: AdmissionConformanceOptions

Defined in: [packages/store-conformance/src/admission-matrix.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L32)

## Methods

### make()

```ts
make(config, now): 
  | AdmissionSchedulerFixture
| Promise<AdmissionSchedulerFixture>;
```

Defined in: [packages/store-conformance/src/admission-matrix.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L34)

A fresh, isolated scheduler per call, over the config and clock.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`AdmissionConfig`](/api/@rulvar/store-conformance/type-aliases/AdmissionConfig.md) |
| `now` | () => `number` |

#### Returns

  \| [`AdmissionSchedulerFixture`](/api/@rulvar/store-conformance/interfaces/AdmissionSchedulerFixture.md)
  \| `Promise`\&lt;[`AdmissionSchedulerFixture`](/api/@rulvar/store-conformance/interfaces/AdmissionSchedulerFixture.md)\&gt;

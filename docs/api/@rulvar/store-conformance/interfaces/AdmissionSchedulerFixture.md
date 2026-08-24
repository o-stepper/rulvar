[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / AdmissionSchedulerFixture

# Interface: AdmissionSchedulerFixture

Defined in: [packages/store-conformance/src/admission-matrix.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L23)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-scheduler"></a> `scheduler` | [`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md) | [packages/store-conformance/src/admission-matrix.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L24) |

## Methods

### close()?

```ts
optional close(): Promise<void>;
```

Defined in: [packages/store-conformance/src/admission-matrix.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L27)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### reopen()

```ts
reopen(): 
  | AdmissionScheduler
| Promise<AdmissionScheduler>;
```

Defined in: [packages/store-conformance/src/admission-matrix.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/admission-matrix.ts#L26)

A NEW holder over the same durable state (the crash rows).

#### Returns

  \| [`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md)
  \| `Promise`\&lt;[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md)\&gt;

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / ConformanceCheck

# Interface: ConformanceCheck

Defined in: [packages/store-conformance/src/types.ts:9](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L9)

One mandatory check; `run` rejects with a descriptive Error on violation.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | [packages/store-conformance/src/types.ts:10](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L10) |
| <a id="property-title"></a> `title` | `string` | [packages/store-conformance/src/types.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L11) |

## Methods

### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/store-conformance/src/types.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L12)

#### Returns

`Promise`\&lt;`void`\&gt;

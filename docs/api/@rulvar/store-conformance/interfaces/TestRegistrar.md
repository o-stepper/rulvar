[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / TestRegistrar

# Interface: TestRegistrar

Defined in: [packages/store-conformance/src/types.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L30)

Structural subset of the Vitest/Jest registration API.

## Methods

### describe()

```ts
describe(name, factory): void;
```

Defined in: [packages/store-conformance/src/types.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L31)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `factory` | () => `void` |

#### Returns

`void`

***

### it()

```ts
it(name, fn): void;
```

Defined in: [packages/store-conformance/src/types.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/types.ts#L32)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `fn` | () => `Promise`\&lt;`void`\&gt; |

#### Returns

`void`

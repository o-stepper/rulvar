[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ExecutorTestRegistrar

# Interface: ExecutorTestRegistrar

Defined in: [packages/executor/src/conformance.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L61)

Structural subset of the Vitest/Jest registration API.

## Methods

### describe()

```ts
describe(name, factory): void;
```

Defined in: [packages/executor/src/conformance.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L62)

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

Defined in: [packages/executor/src/conformance.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `fn` | () => `Promise`\&lt;`void`\&gt; |

#### Returns

`void`

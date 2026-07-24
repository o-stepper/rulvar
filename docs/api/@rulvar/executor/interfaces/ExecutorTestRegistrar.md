[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ExecutorTestRegistrar

# Interface: ExecutorTestRegistrar

Defined in: [packages/executor/src/conformance.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L56)

Structural subset of the Vitest/Jest registration API.

## Methods

### describe()

```ts
describe(name, factory): void;
```

Defined in: [packages/executor/src/conformance.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L57)

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

Defined in: [packages/executor/src/conformance.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L58)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `fn` | () => `Promise`\&lt;`void`\&gt; |

#### Returns

`void`

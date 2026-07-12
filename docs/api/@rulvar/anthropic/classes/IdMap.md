[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / IdMap

# Class: IdMap

Defined in: [packages/anthropic/src/wire.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L23)

Bijective canonical-to-wire tool-call id map.

## Constructors

### Constructor

```ts
new IdMap(mint): IdMap;
```

Defined in: [packages/anthropic/src/wire.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L28)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mint` | () => `string` |

#### Returns

`IdMap`

## Methods

### canonicalFor()

```ts
canonicalFor(wireId): string;
```

Defined in: [packages/anthropic/src/wire.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L32)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wireId` | `string` |

#### Returns

`string`

***

### wireFor()

```ts
wireFor(canonicalId): string;
```

Defined in: [packages/anthropic/src/wire.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L43)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `canonicalId` | `string` |

#### Returns

`string`

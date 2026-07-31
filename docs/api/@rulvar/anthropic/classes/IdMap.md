[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / IdMap

# Class: IdMap

Defined in: [packages/anthropic/src/wire.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L24)

Bijective canonical-to-wire tool-call id map.

## Constructors

### Constructor

```ts
new IdMap(mint): IdMap;
```

Defined in: [packages/anthropic/src/wire.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L29)

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

Defined in: [packages/anthropic/src/wire.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L33)

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

Defined in: [packages/anthropic/src/wire.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `canonicalId` | `string` |

#### Returns

`string`

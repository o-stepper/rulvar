[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiIdMap

# Class: OpenAiIdMap

Defined in: [packages/openai/src/wire.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L25)

Bijective canonical-to-wire (call_*) id map (docs/04, section 1.2).

## Constructors

### Constructor

```ts
new OpenAiIdMap(mint): OpenAiIdMap;
```

Defined in: [packages/openai/src/wire.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mint` | () => `string` |

#### Returns

`OpenAiIdMap`

## Methods

### canonicalFor()

```ts
canonicalFor(wireId): string;
```

Defined in: [packages/openai/src/wire.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L34)

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

Defined in: [packages/openai/src/wire.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L45)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `canonicalId` | `string` |

#### Returns

`string`

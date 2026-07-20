[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / VcrMissError

# Class: VcrMissError

Defined in: [packages/testing/src/vcr.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L368)

Typed hermetic-miss error; onMiss: 'throw' raises it on any request
without a servable row. `recordedOccurrences` above zero means the
hash WAS recorded but every occurrence is already consumed (replay
serves each recorded exchange once, in recorded order); absent or
zero means the request was never recorded at all (v1.29.0 review
P2).

## Extends

- `Error`

## Constructors

### Constructor

```ts
new VcrMissError(
   adapterId, 
   hash, 
   recordedOccurrences?): VcrMissError;
```

Defined in: [packages/testing/src/vcr.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L372)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `adapterId` | `string` |
| `hash` | `string` |
| `recordedOccurrences?` | `number` |

#### Returns

`VcrMissError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-recordedoccurrences"></a> `recordedOccurrences?` | `readonly` | `number` | Rows recorded for this hash; absent or 0 = never recorded. | [packages/testing/src/vcr.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L371) |
| <a id="property-requesthash"></a> `requestHash` | `readonly` | `string` | - | [packages/testing/src/vcr.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L369) |

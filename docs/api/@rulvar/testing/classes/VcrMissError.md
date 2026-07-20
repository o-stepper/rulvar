[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / VcrMissError

# Class: VcrMissError

Defined in: [packages/testing/src/vcr.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L207)

Typed hermetic-miss error; onMiss: 'throw' raises it on any unrecorded request.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new VcrMissError(adapterId, hash): VcrMissError;
```

Defined in: [packages/testing/src/vcr.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L209)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `adapterId` | `string` |
| `hash` | `string` |

#### Returns

`VcrMissError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-requesthash"></a> `requestHash` | `readonly` | `string` | [packages/testing/src/vcr.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L208) |

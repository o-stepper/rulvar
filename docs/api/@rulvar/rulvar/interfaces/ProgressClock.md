[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressClock

# Interface: ProgressClock

Defined in: [packages/rulvar/src/live-progress.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L40)

Injectable time source; every() returns a cancel function.

## Methods

### every()

```ts
every(ms, fn): () => void;
```

Defined in: [packages/rulvar/src/live-progress.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L42)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ms` | `number` |
| `fn` | () => `void` |

#### Returns

() => `void`

***

### now()

```ts
now(): number;
```

Defined in: [packages/rulvar/src/live-progress.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L41)

#### Returns

`number`

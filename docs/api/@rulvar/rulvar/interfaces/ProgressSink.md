[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressSink

# Interface: ProgressSink

Defined in: [packages/rulvar/src/live-progress.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L29)

Raw output sink; chunks may contain ANSI and partial lines.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-columns"></a> `columns?` | `number` | [packages/rulvar/src/live-progress.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L32) |
| <a id="property-istty"></a> `isTTY?` | `boolean` | [packages/rulvar/src/live-progress.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L31) |
| <a id="property-rows"></a> `rows?` | `number` | [packages/rulvar/src/live-progress.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L33) |

## Methods

### write()

```ts
write(chunk): void;
```

Defined in: [packages/rulvar/src/live-progress.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `chunk` | `string` |

#### Returns

`void`

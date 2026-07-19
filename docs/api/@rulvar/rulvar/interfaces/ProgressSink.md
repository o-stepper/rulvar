[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressSink

# Interface: ProgressSink

Defined in: [packages/rulvar/src/live-progress.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L32)

Raw output sink; chunks may contain ANSI and partial lines.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-columns"></a> `columns?` | `number` | [packages/rulvar/src/live-progress.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L35) |
| <a id="property-istty"></a> `isTTY?` | `boolean` | [packages/rulvar/src/live-progress.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L34) |
| <a id="property-rows"></a> `rows?` | `number` | [packages/rulvar/src/live-progress.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L36) |

## Methods

### write()

```ts
write(chunk): void;
```

Defined in: [packages/rulvar/src/live-progress.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `chunk` | `string` |

#### Returns

`void`

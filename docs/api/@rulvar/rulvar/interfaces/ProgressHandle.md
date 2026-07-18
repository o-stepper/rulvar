[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressHandle

# Interface: ProgressHandle

Defined in: [packages/rulvar/src/live-progress.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L66)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-done"></a> `done` | `readonly` | `Promise`\&lt;`void`\&gt; | Settles after the final frame is written; never rejects. | [packages/rulvar/src/live-progress.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L70) |
| <a id="property-mode"></a> `mode` | `readonly` | `"tty"` \| `"lines"` \| `"off"` | The resolved mode after auto detection. | [packages/rulvar/src/live-progress.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L68) |

## Methods

### render()

```ts
render(): void;
```

Defined in: [packages/rulvar/src/live-progress.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L72)

Force an immediate repaint outside the tick (tests, custom pacing).

#### Returns

`void`

***

### stop()

```ts
stop(final?): void;
```

Defined in: [packages/rulvar/src/live-progress.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L78)

Idempotent. final=true (default) paints the settle frame; false
freezes the current frame in scrollback. Always restores the cursor
and resolves `done`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `final?` | `boolean` |

#### Returns

`void`

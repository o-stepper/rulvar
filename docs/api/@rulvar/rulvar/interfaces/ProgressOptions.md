[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressOptions

# Interface: ProgressOptions

Defined in: [packages/rulvar/src/live-progress.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L44)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-clock"></a> `clock?` | [`ProgressClock`](/api/@rulvar/rulvar/interfaces/ProgressClock.md) | Defaults to Date.now plus setInterval. | [packages/rulvar/src/live-progress.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L48) |
| <a id="property-color"></a> `color?` | `boolean` | SGR colors. Default: true in tty mode unless NO_COLOR is set. | [packages/rulvar/src/live-progress.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L57) |
| <a id="property-fps"></a> `fps?` | `number` | Repaints per second in tty mode, clamped to 1..30. Default 10. | [packages/rulvar/src/live-progress.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L55) |
| <a id="property-maxrows"></a> `maxRows?` | `number` | Body rows before the oldest completed rows collapse. Default 24. | [packages/rulvar/src/live-progress.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L61) |
| <a id="property-mode"></a> `mode?` | [`ProgressMode`](/api/@rulvar/rulvar/type-aliases/ProgressMode.md) | 'auto' (default) picks 'tty' when the sink reports a TTY and the environment is not CI or TERM=dumb, else 'lines'. | [packages/rulvar/src/live-progress.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L53) |
| <a id="property-sink"></a> `sink?` | [`ProgressSink`](/api/@rulvar/rulvar/interfaces/ProgressSink.md) | Defaults to process.stderr so application stdout stays clean. | [packages/rulvar/src/live-progress.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L46) |
| <a id="property-title"></a> `title?` | `string` | Header title. Default: the workflow name from run:start. | [packages/rulvar/src/live-progress.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L63) |
| <a id="property-width"></a> `width?` | `number` | Column override. Default sink.columns, else 80. | [packages/rulvar/src/live-progress.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L59) |

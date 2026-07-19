[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressOptions

# Interface: ProgressOptions

Defined in: [packages/rulvar/src/live-progress.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L47)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-clock"></a> `clock?` | [`ProgressClock`](/api/@rulvar/rulvar/interfaces/ProgressClock.md) | Defaults to a monotonic clock (performance.now) plus setInterval. | [packages/rulvar/src/live-progress.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L51) |
| <a id="property-color"></a> `color?` | `boolean` | SGR colors. Default: true in tty mode unless NO_COLOR is set. | [packages/rulvar/src/live-progress.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L60) |
| <a id="property-fps"></a> `fps?` | `number` | Repaints per second in tty mode, clamped to 1..30. Default 10. | [packages/rulvar/src/live-progress.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L58) |
| <a id="property-maxrows"></a> `maxRows?` | `number` | Body rows before the oldest completed rows collapse. Default 24. | [packages/rulvar/src/live-progress.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L64) |
| <a id="property-mode"></a> `mode?` | [`ProgressMode`](/api/@rulvar/rulvar/type-aliases/ProgressMode.md) | 'auto' (default) picks 'tty' when the sink reports a TTY and the environment is not CI or TERM=dumb, else 'lines'. | [packages/rulvar/src/live-progress.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L56) |
| <a id="property-sink"></a> `sink?` | [`ProgressSink`](/api/@rulvar/rulvar/interfaces/ProgressSink.md) | Defaults to process.stderr so application stdout stays clean. | [packages/rulvar/src/live-progress.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L49) |
| <a id="property-title"></a> `title?` | `string` | Header title. Default: the workflow name from run:start. | [packages/rulvar/src/live-progress.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L66) |
| <a id="property-width"></a> `width?` | `number` | Column override. Default sink.columns, else 80. | [packages/rulvar/src/live-progress.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L62) |

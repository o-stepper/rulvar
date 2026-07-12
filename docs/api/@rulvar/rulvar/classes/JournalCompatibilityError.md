[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalCompatibilityError

# Class: JournalCompatibilityError

Defined in: `packages/core/dist/index.d.ts`

Refusal to open a journal whose hashVersion falls outside the engine's
support window (producers ship in M2).
The registry code is 'journal_compat'; the sub-codes live on
`subCode` and in `data`.

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new JournalCompatibilityError(message, detail): JournalCompatibilityError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `detail` | \{ `entryHashVersion`: `number`; `entrySeq`: `number`; `hint`: `string`; `runId`: `string`; `subCode`: [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md); `supportedRange`: \{ `max`: `number`; `min`: `number`; \}; \} |
| `detail.entryHashVersion` | `number` |
| `detail.entrySeq` | `number` |
| `detail.hint` | `string` |
| `detail.runId` | `string` |
| `detail.subCode` | [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md) |
| `detail.supportedRange` | \{ `max`: `number`; `min`: `number`; \} |
| `detail.supportedRange.max` | `number` |
| `detail.supportedRange.min` | `number` |

#### Returns

`JournalCompatibilityError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-cause"></a> `cause?` | `public` | `unknown` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`cause`](/api/@rulvar/rulvar/classes/RulvarError.md#property-cause) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:24](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts#L24) |
| <a id="property-code"></a> `code` | `readonly` | `"journal_compat"` | `"journal_compat"` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-entryhashversion"></a> `entryHashVersion` | `readonly` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-entryseq"></a> `entrySeq` | `readonly` | `number` | `undefined` | Seq of the first violating entry. | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-hint"></a> `hint` | `readonly` | `string` | `undefined` | 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-message"></a> `message` | `public` | `string` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`message`](/api/@rulvar/rulvar/classes/RulvarError.md#property-message) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1075](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1075) |
| <a id="property-name"></a> `name` | `public` | `string` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`name`](/api/@rulvar/rulvar/classes/RulvarError.md#property-name) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1074](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1074) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-stack"></a> `stack?` | `public` | `string` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`stack`](/api/@rulvar/rulvar/classes/RulvarError.md#property-stack) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1076](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1076) |
| <a id="property-subcode"></a> `subCode` | `readonly` | [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md) | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-supportedrange"></a> `supportedRange` | `readonly` | \{ `max`: `number`; `min`: `number`; \} | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| `supportedRange.max` | `public` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| `supportedRange.min` | `public` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | `undefined` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`stackTraceLimit`](/api/@rulvar/rulvar/classes/RulvarError.md#property-stacktracelimit) | [node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts:68](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts#L68) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`toWire`](/api/@rulvar/rulvar/classes/RulvarError.md#towire)

***

### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: [node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts:52](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts#L52)

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`captureStackTrace`](/api/@rulvar/rulvar/classes/RulvarError.md#capturestacktrace)

***

### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: [node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts:56](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`prepareStackTrace`](/api/@rulvar/rulvar/classes/RulvarError.md#preparestacktrace)

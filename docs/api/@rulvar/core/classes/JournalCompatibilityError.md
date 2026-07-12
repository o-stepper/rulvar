[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalCompatibilityError

# Class: JournalCompatibilityError

Defined in: [packages/core/src/l0/errors.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L128)

Refusal to open a journal whose hashVersion falls outside the engine's
support window (docs/03, section "hashVersion"; producers ship in M2).
The registry code is 'journal_compat'; the docs/03 sub-codes live on
`subCode` and in `data`.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new JournalCompatibilityError(message, detail): JournalCompatibilityError;
```

Defined in: [packages/core/src/l0/errors.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L139)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `detail` | \{ `entryHashVersion`: `number`; `entrySeq`: `number`; `hint`: `string`; `runId`: `string`; `subCode`: [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md); `supportedRange`: \{ `max`: `number`; `min`: `number`; \}; \} |
| `detail.entryHashVersion` | `number` |
| `detail.entrySeq` | `number` |
| `detail.hint` | `string` |
| `detail.runId` | `string` |
| `detail.subCode` | [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md) |
| `detail.supportedRange` | \{ `max`: `number`; `min`: `number`; \} |
| `detail.supportedRange.max` | `number` |
| `detail.supportedRange.min` | `number` |

#### Returns

`JournalCompatibilityError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-cause"></a> `cause?` | `public` | `unknown` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`cause`](/api/@rulvar/core/classes/RulvarError.md#property-cause) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:24](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts#L24) |
| <a id="property-code"></a> `code` | `readonly` | `"journal_compat"` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L129) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L57) |
| <a id="property-entryhashversion"></a> `entryHashVersion` | `readonly` | `number` | - | - | - | [packages/core/src/l0/errors.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L134) |
| <a id="property-entryseq"></a> `entrySeq` | `readonly` | `number` | Seq of the first violating entry. | - | - | [packages/core/src/l0/errors.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L133) |
| <a id="property-hint"></a> `hint` | `readonly` | `string` | 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. | - | - | [packages/core/src/l0/errors.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L137) |
| <a id="property-message"></a> `message` | `public` | `string` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`message`](/api/@rulvar/core/classes/RulvarError.md#property-message) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1075](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1075) |
| <a id="property-name"></a> `name` | `public` | `string` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`name`](/api/@rulvar/core/classes/RulvarError.md#property-name) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1074](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1074) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L56) |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | - | - | [packages/core/src/l0/errors.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L131) |
| <a id="property-stack"></a> `stack?` | `public` | `string` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`stack`](/api/@rulvar/core/classes/RulvarError.md#property-stack) | [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1076](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts#L1076) |
| <a id="property-subcode"></a> `subCode` | `readonly` | [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md) | - | - | - | [packages/core/src/l0/errors.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L130) |
| <a id="property-supportedrange"></a> `supportedRange` | `readonly` | \{ `max`: `number`; `min`: `number`; \} | - | - | - | [packages/core/src/l0/errors.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L135) |
| `supportedRange.max` | `public` | `number` | - | - | - | [packages/core/src/l0/errors.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L135) |
| `supportedRange.min` | `public` | `number` | - | - | - | [packages/core/src/l0/errors.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L135) |
| <a id="property-stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`stackTraceLimit`](/api/@rulvar/core/classes/RulvarError.md#property-stacktracelimit) | [node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts:68](https://github.com/o-stepper/rulvar/blob/main/node\_modules/.pnpm/@types+node@22.20.0/node\_modules/@types/node/globals.d.ts#L68) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L68)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)

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

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`captureStackTrace`](/api/@rulvar/core/classes/RulvarError.md#capturestacktrace)

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

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`prepareStackTrace`](/api/@rulvar/core/classes/RulvarError.md#preparestacktrace)

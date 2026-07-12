[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionRejectedError

# Class: AdmissionRejectedError

Defined in: `packages/core/dist/index.d.ts`

A structural admission rejection (maxDepth, maxChildrenPerNode,
maxTotalSpawns) from the AdmissionController (M6-T06). The rejection verdict is embedded in
the carrying spawn-admission decision entry and replays identically;
the error surfaces the embedded AdmitRejectReason in `data` to the
caller (a typed tool error for orchestrators) and MUST NOT tear down
the run. Budget-code rejections throw BudgetExhaustedError instead,
keeping the budget exhaustion semantics (https://docs.rulvar.com/guide/budgets).

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new AdmissionRejectedError(message, opts?): AdmissionRejectedError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`AdmissionRejectedError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"admission_rejected"` | `"admission_rejected"` | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |

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

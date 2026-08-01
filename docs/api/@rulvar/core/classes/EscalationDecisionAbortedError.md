[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationDecisionAbortedError

# Class: EscalationDecisionAbortedError

Defined in: [packages/core/src/engine/external.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L58)

The rejection carrier of an aborted flavor B decision wait (v1.35.0
review P1): the parked `awaitDecision` observes the branch/run
AbortSignal, releases its held activity, removes its waiter, and
rejects with this class so cancel, host abort, the run deadline, and
failed sibling aborts all settle the run in bounded time.
Deliberately not a RulvarError: the abort is cancellation intent, not
a registry failure class; the suspension entry stays OPEN, so a later
resume parks the decision again and the durable deadline still applies.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new EscalationDecisionAbortedError(message, entryRef): EscalationDecisionAbortedError;
```

Defined in: [packages/core/src/engine/external.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L61)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `entryRef` | `number` |

#### Returns

`EscalationDecisionAbortedError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef` | `readonly` | `number` | [packages/core/src/engine/external.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L59) |

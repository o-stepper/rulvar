[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalationDecisionAbortedError

# Class: EscalationDecisionAbortedError

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-entryref"></a> `entryRef` | `readonly` | `number` | `packages/core/dist/index.d.ts` |

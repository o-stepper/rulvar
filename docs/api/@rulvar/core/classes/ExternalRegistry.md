[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExternalRegistry

# Class: ExternalRegistry

Defined in: [packages/core/src/engine/external.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L63)

Per-run registry of open external suspensions plus the run's activity
counter: when every in-flight branch is blocked on suspensions
(activity zero, waiters open), the run quiesces into outcome
'suspended'.

## Constructors

### Constructor

```ts
new ExternalRegistry(replayer, emitEvent?): ExternalRegistry;
```

Defined in: [packages/core/src/engine/external.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L73)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `replayer` | [`Replayer`](/api/@rulvar/core/classes/Replayer.md) |
| `emitEvent?` | (`body`) => `void` |

#### Returns

`ExternalRegistry`

## Methods

### awaitApproval()

```ts
awaitApproval(options): Promise<ApprovalDecision>;
```

Defined in: [packages/core/src/engine/external.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L239)

Tool-approval suspension (M3-T03): journals (or
re-matches) the suspended approval entry keyed by (toolName, input)
in the agent's child scope and parks until a resolution closes it.
The ask verdict is journaled together with the turn checkpoint; on
resume an already-resolved entry applies its decision immediately and
is never re-suspended.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `input`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); `onPending?`: (`entry`, `replayed`) => `void`; `risk?`: `string`; `scope`: `string`; `spanId`: `string`; `toolName`: `string`; \} | - |
| `options.input` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - |
| `options.onPending?` | (`entry`, `replayed`) => `void` | Called with the suspended entry once it is open (live or re-parked). |
| `options.risk?` | `string` | - |
| `options.scope` | `string` | - |
| `options.spanId` | `string` | - |
| `options.toolName` | `string` | - |

#### Returns

`Promise`\&lt;[`ApprovalDecision`](/api/@rulvar/core/interfaces/ApprovalDecision.md)\&gt;

***

### awaitDecision()

```ts
awaitDecision(options): Promise<{
  entryRef: number;
  value: Json;
}>;
```

Defined in: [packages/core/src/engine/external.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L316)

Flavor B escalation suspension (M3-T07): the
escalate tool suspends the agent on the SAME machinery as approvals
(kind 'approval', toolName 'escalate') with a journaled deadlineAt so
deadlines survive resume; the resolution VALUE is the raw
EscalationDecision. A timeout is expressed as a resolution by
'timeout' through the arbiter; first-closing-wins guarantees the
defaultDecision and a racing live decision never both apply.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `deadlineAt`: `string`; `input`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); `onPending?`: (`entry`, `replayed`) => `void`; `scope`: `string`; `spanId`: `string`; `toolName`: `string`; \} |
| `options.deadlineAt` | `string` |
| `options.input` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |
| `options.onPending?` | (`entry`, `replayed`) => `void` |
| `options.scope` | `string` |
| `options.spanId` | `string` |
| `options.toolName` | `string` |

#### Returns

`Promise`\<\{
  `entryRef`: `number`;
  `value`: [`Json`](/api/@rulvar/core/type-aliases/Json.md);
\}\>

***

### awaitExternal()

```ts
awaitExternal(
   scope, 
   spanId, 
   key, 
options?): Promise<Json>;
```

Defined in: [packages/core/src/engine/external.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L169)

ctx.awaitExternal: journal (or re-match) the suspended entry and park
until a resolution wins the first-closing-wins fold.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `spanId` | `string` |
| `key` | `string` |
| `options?` | \{ `prompt?`: `string`; `schema?`: [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md); \} |
| `options.prompt?` | `string` |
| `options.schema?` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

#### Returns

`Promise`\&lt;[`Json`](/api/@rulvar/core/type-aliases/Json.md)\&gt;

***

### enter()

```ts
enter(): () => void;
```

Defined in: [packages/core/src/engine/external.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L101)

Wraps every non-suspension async operation (agents, steps).

#### Returns

() => `void`

***

### onQuiesce()

```ts
onQuiesce(listener): void;
```

Defined in: [packages/core/src/engine/external.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L130)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `listener` | (`pending`) => `void` |

#### Returns

`void`

***

### pending()

```ts
pending(): PendingExternal[];
```

Defined in: [packages/core/src/engine/external.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L134)

#### Returns

[`PendingExternal`](/api/@rulvar/core/interfaces/PendingExternal.md)[]

***

### resolveExternal()

```ts
resolveExternal(key, value): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/engine/external.ts:402](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L402)

RunHandle.resolveExternal: the live path validates BEFORE append and
throws InvalidResolutionError without journaling; a winning attempt
settles the waiting promise in place.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

***

### submitResolution()

```ts
submitResolution(entryRef, attempt): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/engine/external.ts:381](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L381)

Submits a resolution attempt for a parked suspension and, when it
wins the first-closing-wins fold, settles the in-process waiter with
the value (timers and engine-side deciders use this; operator
resolutions ride resolveExternal).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entryRef` | `number` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/core/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

***

### approvalKey()

```ts
static approvalKey(entryRef): string;
```

Defined in: [packages/core/src/engine/external.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L144)

The synthesized resolveExternal key of an approval suspension.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entryRef` | `number` |

#### Returns

`string`

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InProcessRunner

# Class: InProcessRunner

Defined in: [packages/core/src/runner/inprocess.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L50)

The mode (a) runner for human-authored closures. Determinism is enforced
by convention, lint, and the ctx shims, NOT by a VM: only the sequence
of keys must be stable. Bare-nondeterminism detection is ENGINE-owned
since RV-209: the engine wraps its `execute` call in
`withDeterminismDetection` (runner/determinism.ts), which classifies
bare Date.now/Math.random callers, emits the structured
`determinism:warning` event on the run's stream, and under
`determinism.mode: 'error'` rejects the run with a typed
DeterminismError. The runner itself is a pure executor, so the frozen
ScriptRunner seam carries no detection surface; a standalone execute
outside an engine runs without detection.

## Implements

- [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md)

## Constructors

### Constructor

```ts
new InProcessRunner(o?): InProcessRunner;
```

Defined in: [packages/core/src/runner/inprocess.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L53)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `o?` | \{ `onEscalation?`: [`OnEscalation`](/api/@rulvar/core/type-aliases/OnEscalation.md); \} |
| `o.onEscalation?` | [`OnEscalation`](/api/@rulvar/core/type-aliases/OnEscalation.md) |

#### Returns

`InProcessRunner`

## Accessors

### escalationHook

#### Get Signature

```ts
get escalationHook(): 
  | OnEscalation
  | undefined;
```

Defined in: [packages/core/src/runner/inprocess.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L60)

The hook is read by the escalation delivery path from M3 onward.

##### Returns

  \| [`OnEscalation`](/api/@rulvar/core/type-aliases/OnEscalation.md)
  \| `undefined`

## Methods

### execute()

```ts
execute<A, R>(
   wf, 
   ctx, 
args): Promise<R>;
```

Defined in: [packages/core/src/runner/inprocess.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L64)

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`CompiledWorkflow`](/api/@rulvar/core/interfaces/CompiledWorkflow.md) \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `ctx` | [`Ctx`](/api/@rulvar/core/interfaces/Ctx.md)\&lt;`never`\&gt; |
| `args` | `A` |

#### Returns

`Promise`\&lt;`R`\&gt;

#### Implementation of

[`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md).[`execute`](/api/@rulvar/core/interfaces/ScriptRunner.md#execute)

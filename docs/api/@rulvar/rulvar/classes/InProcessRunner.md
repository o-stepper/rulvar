[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InProcessRunner

# Class: InProcessRunner

Defined in: `packages/core/dist/index.d.ts`

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

- [`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md)

## Constructors

### Constructor

```ts
new InProcessRunner(o?): InProcessRunner;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `o?` | \{ `onEscalation?`: [`OnEscalation`](/api/@rulvar/rulvar/type-aliases/OnEscalation.md); \} |
| `o.onEscalation?` | [`OnEscalation`](/api/@rulvar/rulvar/type-aliases/OnEscalation.md) |

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

Defined in: `packages/core/dist/index.d.ts`

The hook is read by the escalation delivery path from M3 onward.

##### Returns

  \| [`OnEscalation`](/api/@rulvar/rulvar/type-aliases/OnEscalation.md)
  \| `undefined`

## Methods

### execute()

```ts
execute<A, R>(
   wf, 
   ctx, 
args): Promise<R>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `ctx` | [`Ctx`](/api/@rulvar/rulvar/interfaces/Ctx.md)\&lt;`never`\&gt; |
| `args` | `A` |

#### Returns

`Promise`\&lt;`R`\&gt;

#### Implementation of

[`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md).[`execute`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md#execute)

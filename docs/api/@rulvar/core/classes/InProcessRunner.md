[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InProcessRunner

# Class: InProcessRunner

Defined in: [packages/core/src/runner/inprocess.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L46)

The mode (a) runner for human-authored closures. Determinism is enforced
by convention, lint, and the ctx shims, NOT by a VM: only the sequence
of keys must be stable. Dev mode (NODE_ENV !== 'production') patches
Date.now and Math.random for the duration of execute to emit one warning
per run pointing at ctx.now()/ctx.random(); the patch preserves behavior
and restores the prior functions on exit (nesting-safe by capturing the
prior value; concurrent runs may lose the warning, never correctness).

## Implements

- [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md)

## Constructors

### Constructor

```ts
new InProcessRunner(o?): InProcessRunner;
```

Defined in: [packages/core/src/runner/inprocess.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L49)

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

Defined in: [packages/core/src/runner/inprocess.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L56)

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

Defined in: [packages/core/src/runner/inprocess.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L60)

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

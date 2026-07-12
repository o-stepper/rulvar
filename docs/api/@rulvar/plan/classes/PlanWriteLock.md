[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanWriteLock

# Class: PlanWriteLock

Defined in: [packages/plan/src/write-lock.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/write-lock.ts#L15)

PlanWriteLock (M7-T01): the in-process FIFO mutex serializing live
appends to the sequential scope "plan".

Owning spec: docs/07-adaptive-orchestration-spec.md, section 3.2
(DEF-8, XF-07). The lock serializes ONLY plan-scope appends (acquire,
read the fold head, evaluate, append, release); it MUST NOT substitute
for resolution arbitration, which is owned by the ResolutionArbiter
(docs/03, section "Suspension and resolutions (DEF-4)"). In queue mode
the lease fencing epoch applies on top. Wall clock influences only
WHICH order gets recorded live; replay reads the recorded order and
never takes the lock.

## Constructors

### Constructor

```ts
new PlanWriteLock(): PlanWriteLock;
```

#### Returns

`PlanWriteLock`

## Accessors

### isHeld

#### Get Signature

```ts
get isHeld(): boolean;
```

Defined in: [packages/plan/src/write-lock.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/write-lock.ts#L20)

True while a critical section is running (diagnostics only).

##### Returns

`boolean`

## Methods

### runExclusive()

```ts
runExclusive<T>(fn): Promise<T>;
```

Defined in: [packages/plan/src/write-lock.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/write-lock.ts#L29)

Runs `fn` exclusively, in strict acquisition (FIFO) order. The lock
releases on settlement either way; a rejection propagates to THIS
caller and never poisons later acquisitions.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `T` \| `Promise`\&lt;`T`\&gt; |

#### Returns

`Promise`\&lt;`T`\&gt;

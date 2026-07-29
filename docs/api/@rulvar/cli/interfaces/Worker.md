[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / Worker

# Interface: Worker

Defined in: [packages/cli/src/worker.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L109)

## Methods

### active()

```ts
active(): string[];
```

Defined in: [packages/cli/src/worker.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L121)

runIds currently held by this worker.

#### Returns

`string`[]

***

### start()

```ts
start(): void;
```

Defined in: [packages/cli/src/worker.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L111)

Begins sweeping on the poll cadence. Idempotent.

#### Returns

`void`

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/cli/src/worker.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L119)

Stops sweeping, cancels in-flight runs, releases held leases.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### sweep()

```ts
sweep(): Promise<number>;
```

Defined in: [packages/cli/src/worker.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L117)

One sweep: lease and resume eligible runs up to the concurrency
cap. Returns the number of runs picked up. Exposed so hosts and
tests can drive the worker deterministically without timers.

#### Returns

`Promise`\&lt;`number`\&gt;

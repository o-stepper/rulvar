[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / Worker

# Interface: Worker

Defined in: [packages/cli/src/worker.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L262)

## Methods

### active()

```ts
active(): string[];
```

Defined in: [packages/cli/src/worker.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L282)

runIds occupying a slot: runs held under a lease, plus evicted runs
(a failed renew) still unwinding their cancel. A slot frees only
when its run settles, never before the cancel lands (RV4913).

#### Returns

`string`[]

***

### lastSweepError()

```ts
lastSweepError(): unknown;
```

Defined in: [packages/cli/src/worker.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L289)

Readiness (RV4913): the error of the most recent sweep that failed
against the store, or undefined once a later sweep completed. A
store outage used to be a silent idle; with this flag a health
probe can report a worker that polls a store it cannot read.

#### Returns

`unknown`

***

### start()

```ts
start(): void;
```

Defined in: [packages/cli/src/worker.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L264)

Begins sweeping on the poll cadence. Idempotent.

#### Returns

`void`

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/cli/src/worker.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L276)

Stops sweeping, cancels in flight runs (evicted runs included) and
waits for their settle, releases held leases.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### sweep()

```ts
sweep(): Promise<number>;
```

Defined in: [packages/cli/src/worker.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L271)

One sweep: lease and resume eligible runs up to the concurrency
cap. Returns the number of runs picked up. Exposed so hosts and
tests can drive the worker deterministically without timers. A
store failure rejects here and raises `lastSweepError()`.

#### Returns

`Promise`\&lt;`number`\&gt;

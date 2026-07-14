[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionArbiter

# Class: ResolutionArbiter

Defined in: `packages/core/dist/index.d.ts`

Per-run, per-target FIFO serializer of resolution/abandon attempts:
classification against the in-memory fold ->
durable append -> settle exactly once; losing attempts are ALSO
appended and become journaled noops by fold classification. Winner
effects run strictly after the critical section (the caller's job).
Cross-process protection remains the LeasableStore fencing epoch.

## Constructors

### Constructor

```ts
new ResolutionArbiter(fold, appender): ResolutionArbiter;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fold` | [`ResolutionFold`](/api/@rulvar/rulvar/classes/ResolutionFold.md) |
| `appender` | [`RefEntryAppender`](/api/@rulvar/rulvar/interfaces/RefEntryAppender.md) |

#### Returns

`ResolutionArbiter`

## Methods

### submitAbandon()

```ts
submitAbandon(
   targetScope, 
   spanId, 
attempt): Promise<ResolutionOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetScope` | `string` |
| `spanId` | `string` |
| `attempt` | [`AbandonAttempt`](/api/@rulvar/rulvar/type-aliases/AbandonAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/rulvar/type-aliases/ResolutionOutcome.md)\&gt;

***

### submitResolution()

```ts
submitResolution(
   target, 
   targetScope, 
   spanId, 
attempt): Promise<ResolutionOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |
| `targetScope` | `string` |
| `spanId` | `string` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/rulvar/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/rulvar/type-aliases/ResolutionOutcome.md)\&gt;

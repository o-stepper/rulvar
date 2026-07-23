[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionArbiter

# Class: ResolutionArbiter

Defined in: [packages/core/src/journal/resolution.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L301)

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

Defined in: [packages/core/src/journal/resolution.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L306)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fold` | [`ResolutionFold`](/api/@rulvar/core/classes/ResolutionFold.md) |
| `appender` | [`RefEntryAppender`](/api/@rulvar/core/interfaces/RefEntryAppender.md) |

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

Defined in: [packages/core/src/journal/resolution.ts:365](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L365)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetScope` | `string` |
| `spanId` | `string` |
| `attempt` | [`AbandonAttempt`](/api/@rulvar/core/type-aliases/AbandonAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

***

### submitResolution()

```ts
submitResolution(
   target, 
   targetScope, 
   spanId, 
attempt): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/journal/resolution.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L321)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |
| `targetScope` | `string` |
| `spanId` | `string` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/core/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

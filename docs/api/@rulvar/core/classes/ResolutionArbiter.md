[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionArbiter

# Class: ResolutionArbiter

Defined in: [packages/core/src/journal/resolution.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L289)

Per-run, per-target FIFO serializer of resolution/abandon attempts
(docs/03, section 8.5): classification against the in-memory fold ->
durable append -> settle exactly once; losing attempts are ALSO
appended and become journaled noops by fold classification. Winner
effects run strictly after the critical section (the caller's job).
Cross-process protection remains the LeasableStore fencing epoch.

## Constructors

### Constructor

```ts
new ResolutionArbiter(fold, appender): ResolutionArbiter;
```

Defined in: [packages/core/src/journal/resolution.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L294)

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

Defined in: [packages/core/src/journal/resolution.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L353)

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

Defined in: [packages/core/src/journal/resolution.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L309)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |
| `targetScope` | `string` |
| `spanId` | `string` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/core/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

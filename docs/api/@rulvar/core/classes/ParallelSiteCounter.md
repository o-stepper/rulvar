[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ParallelSiteCounter

# Class: ParallelSiteCounter

Defined in: [packages/core/src/journal/scope.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L148)

Allocates parallel site numbers per enclosing scope: a monotonic counter
in execution order, not source position. Because every scope body is
sequential by construction (I3), allocation order is deterministic and
identical on every replay.

## Constructors

### Constructor

```ts
new ParallelSiteCounter(): ParallelSiteCounter;
```

#### Returns

`ParallelSiteCounter`

## Methods

### next()

```ts
next(enclosingScope): number;
```

Defined in: [packages/core/src/journal/scope.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L151)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `enclosingScope` | `string` |

#### Returns

`number`

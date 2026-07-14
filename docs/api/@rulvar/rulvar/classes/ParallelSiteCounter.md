[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ParallelSiteCounter

# Class: ParallelSiteCounter

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `enclosingScope` | `string` |

#### Returns

`number`

[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalMatcher

# Class: JournalMatcher

Defined in: [packages/core/src/journal/matching.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L89)

The matching engine over a loaded journal. Consumption is per logical
operation (running/terminal pairs count once); candidates are consumed
in journal order, first unconsumed match wins (this also resolves
cross-version double matches deterministically).

## Constructors

### Constructor

```ts
new JournalMatcher(entries, options?): JournalMatcher;
```

Defined in: [packages/core/src/journal/matching.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L104)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `options?` | \{ `disposition?`: (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md); `keyRing?`: [`KeyRing`](/api/@rulvar/core/interfaces/KeyRing.md); \} |
| `options.disposition?` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) |
| `options.keyRing?` | [`KeyRing`](/api/@rulvar/core/interfaces/KeyRing.md) |

#### Returns

`JournalMatcher`

## Methods

### consume()

```ts
consume(runningSeq): void;
```

Defined in: [packages/core/src/journal/matching.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L291)

Marks an operation consumed without matching (fold-driven paths).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runningSeq` | `number` |

#### Returns

`void`

***

### match()

```ts
match(
   scope, 
   identity, 
   mode): MatchResult;
```

Defined in: [packages/core/src/journal/matching.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L219)

Forward-matches one live call. A miss does not advance any cursor and
does not extinguish future hits: the scan always starts at the scope
head and skips consumed operations, so insertion stability holds by
construction (docs/03, section 7.1).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `identity` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |
| `mode` | `"scoped"` \| `"cache"` \| `"never"` |

#### Returns

[`MatchResult`](/api/@rulvar/core/type-aliases/MatchResult.md)

***

### registerAlias()

```ts
registerAlias(donorPrefix, targetPrefix): void;
```

Defined in: [packages/core/src/journal/matching.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L160)

Registers a scope-prefix rewrite (node.link, DEF-5): donorPrefix maps
to targetPrefix for forward-matching purposes; the per-scope cursors
work unchanged at every nested level, so partial subtree reuse falls
out for free at any depth.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `donorPrefix` | `string` |
| `targetPrefix` | `string` |

#### Returns

`void`

***

### report()

```ts
report(): ResumeReport;
```

Defined in: [packages/core/src/journal/matching.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L295)

#### Returns

[`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md)

***

### setAliasDisposition()

```ts
setAliasDisposition(disposition): void;
```

Defined in: [packages/core/src/journal/matching.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L150)

The disposition applied to alias-sourced candidates (DEF-5, docs/03
9.5): the skipped overlay from abandon is bypassed ONLY through the
alias, so entries regain their pre-abandon terminal status for
matching in the NEW scope; the standalone old scope stays skipped.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) |

#### Returns

`void`

***

### setDisposition()

```ts
setDisposition(disposition): void;
```

Defined in: [packages/core/src/journal/matching.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L140)

M2-T06 swaps in the full DEF-1 predicate after folds are built.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) |

#### Returns

`void`

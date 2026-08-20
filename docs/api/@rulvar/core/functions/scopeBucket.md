[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / scopeBucket

# Function: scopeBucket()

```ts
function scopeBucket(scope): string;
```

Defined in: [packages/core/src/engine/cost-report.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L129)

The scope key rule of the byScope rollup (RV3805). The root's OWN
scope is the empty string BY CONSTRUCTION: present data whose string
happens to be empty, not an absence, so it folds under the
addressable name 'root' instead of the RV3604 'unknown' fallback,
which stays reserved for a scope that is truly missing. Children
keep their scope strings verbatim. One rule for both builders, so
the live report and the journal fold cannot disagree on the key.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` \| `undefined` |

## Returns

`string`

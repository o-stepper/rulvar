[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / metaMatchesFilter

# Function: metaMatchesFilter()

```ts
function metaMatchesFilter(meta, f?): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

The RunFilter predicate shared by the shipped stores (and usable by
callers re-checking an advisory `statuses` filter a legacy store may
have ignored). `status` and `statuses` combine as either-matches.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `meta` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

## Returns

`boolean`

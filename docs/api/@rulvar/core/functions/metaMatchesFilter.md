[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / metaMatchesFilter

# Function: metaMatchesFilter()

```ts
function metaMatchesFilter(meta, f?): boolean;
```

Defined in: [packages/core/src/stores/meta-lookup.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/meta-lookup.ts#L34)

The RunFilter predicate shared by the shipped stores (and usable by
callers re-checking an advisory `statuses` filter a legacy store may
have ignored). `status` and `statuses` combine as either-matches.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `meta` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

## Returns

`boolean`

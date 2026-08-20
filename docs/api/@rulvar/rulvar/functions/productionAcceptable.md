[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / productionAcceptable

# Function: productionAcceptable()

```ts
function productionAcceptable(verdict): {
  ok: boolean;
  reason?: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

The production acceptance predicate (RV4209): the one boolean a
production consumer gates on, with the stable reason when it
refuses. A verdict is production-acceptable exactly when it exists
and reads 'clean': 'partial' and 'vacuous' are legal diagnostics
(strict keeps exit 0 on them by documented design), 'waived' is a
human exception a machine gate must surface rather than inherit,
and an ABSENT verdict means nothing judged anything, which a
production gate reads fail closed. Exported so the CLI's
`--acceptance-policy production`, a server consumer, and a host
pipeline apply the SAME rule instead of three re-derivations.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `verdict` | \| [`SemanticTerminalVerdict`](/api/@rulvar/rulvar/interfaces/SemanticTerminalVerdict.md) \| `undefined` |

## Returns

```ts
{
  ok: boolean;
  reason?: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `ok` | `boolean` | `packages/core/dist/index.d.ts` |
| `reason?` | `string` | `packages/core/dist/index.d.ts` |

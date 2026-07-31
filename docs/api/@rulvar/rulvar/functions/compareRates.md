[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compareRates

# Function: compareRates()

```ts
function compareRates(seed, page): string[];
```

Defined in: `packages/core/dist/index.d.ts`

Compares a pricing seed against rates extracted from the provider's
documented pricing page, in BOTH directions (RV902): a seed rate the
page moved or dropped is a finding, and so is a documented billable
rate the seed never declared, because a billable column missing from
the seed is a silent underpricing channel (the 1h cache-write premium
hid exactly there). Declared long-context tiers compare field by
field. Returns human-readable findings, empty when the sides agree;
the weekly rates audit (scripts/rates-audit.mjs) runs this exact
comparator over the live pages, and the fault-injection kit drives it
as a permanent gate (RV909). It verifies DOCUMENTATION, not billing:
only a statement reconciliation over saved exports settles what the
provider's meter actually charges.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`DocumentedRates`](/api/@rulvar/rulvar/interfaces/DocumentedRates.md) |
| `page` | [`DocumentedRates`](/api/@rulvar/rulvar/interfaces/DocumentedRates.md) |

## Returns

`string`[]

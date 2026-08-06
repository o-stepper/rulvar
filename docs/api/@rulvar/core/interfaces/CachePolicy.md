[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CachePolicy

# Interface: CachePolicy

Defined in: [packages/core/src/l0/messages.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L110)

The prompt-cache policy (RV2006): whether and how the agent loop
compiles [CacheHint](/api/@rulvar/core/interfaces/CacheHint.md) onto every turn of its tool cycle.
'auto' (the default when no policy is declared anywhere) attaches
breakpoints after tools, after system, and after the deepest message
(sliding each turn) on adapters that declare
`ModelCaps.promptCaching: 'explicit'`; adapters without the
declaration, and providers whose caching is implicit server-side,
never see a hint, so their wire traffic stays byte identical.
'off' is the opt-out. The hint is transport-level cost optimization
only: it never enters identity, journals, or cassette keys. The
third parity rerun priced the absence: every turn of a ~550k-token
worker context re-paid the full input rate because nothing in the
core ever populated the hint the adapter could compile.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-mode"></a> `mode?` | `"auto"` \| `"off"` | - | [packages/core/src/l0/messages.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L111) |
| <a id="property-ttl"></a> `ttl?` | [`CacheTtl`](/api/@rulvar/core/type-aliases/CacheTtl.md) | Breakpoint TTL; default '5m'. | [packages/core/src/l0/messages.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L113) |

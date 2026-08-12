[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalTelemetryScopes

# Type Alias: TerminalTelemetryScopes

```ts
type TerminalTelemetryScopes = Readonly<Record<keyof RunOutcome<unknown>, TelemetryScope>> & Readonly<Record<string, TelemetryScope>>;
```

Defined in: [packages/core/src/stores/reconcile.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L313)

The scope table's type, and the gate that keeps it complete
(RV2701).

Every field of `RunOutcome` is required, so a new terminal field
does not COMPILE until it declares what it counts; the string index
signature then admits the nested paths a consumer reads off the same
outcome (`cost.orchestrator.wakes`), which are not keys of the type.
Those it admits but cannot demand, so the table itself is held to
every counted leaf under `cost` where it is declared (RV2801).

It replaces a sample: the original gate read the keys of one
successful run, which is structurally blind to every field that
exists only on a FAILED terminal, and RV2602's `childrenAtFailure`
(present exactly when no acceptance verdict exists) shipped straight
through it. A table about resumed and killed runs cannot be
defended by an outcome that neither died nor resumed.

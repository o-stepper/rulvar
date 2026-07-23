[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / BOOT\_BUSY\_TIMEOUT\_MS

# Variable: BOOT\_BUSY\_TIMEOUT\_MS

```ts
const BOOT_BUSY_TIMEOUT_MS: 5000 = 5_000;
```

Defined in: [packages/store-sqlite/src/store.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L71)

Total time the constructor keeps retrying its schema bootstrap
through SQLITE_BUSY before giving up, so concurrent multi-process
construction over one fresh file serializes instead of dying raw.
The bound applies ONLY to boot; every runtime contention path keeps
the documented fail-fast semantics (busy surfaces immediately). A
boot still busy past the bound throws the driver's error: something
is wedged, not merely concurrent.

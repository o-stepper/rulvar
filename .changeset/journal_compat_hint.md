---
'@rulvar/core': patch
---

The too-old-journal refusal no longer points at an export that does not exist.

`JournalCompatibilityError` with subCode `HASH_VERSION_TOO_OLD` interpolated the version into a symbol name, so a v0 journal produced the hint `enable deriverV0 from @rulvar/compat via extraDerivers`. `@rulvar/compat` ships `deriverV0Synthetic`; there is no `deriverV0`. A reader with a genuinely too-old journal was sent to an import that is not there, and a dead end is worse than no hint.

The hint now names the mechanism and the package, never a symbol, so it cannot go stale when a frozen profile is named something else:

```
register a hashVersion 0 KeyDeriver through createEngine({ extraDerivers });
@rulvar/compat ships the frozen profiles
```

Nothing else changes: the refusal is still typed, still raised before any live call, append, or admission reserve, and `extraDerivers` still reopens the window exactly as before.

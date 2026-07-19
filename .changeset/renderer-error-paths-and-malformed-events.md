---
'@rulvar/rulvar': patch
'@rulvar/cli': patch
---

The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

- `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
- Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
- `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
- `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

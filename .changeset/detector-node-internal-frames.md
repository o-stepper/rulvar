---
'@rulvar/core': patch
---

The development mode bare nondeterminism detector no longer warns when Node's own machinery consults `Date.now` or `Math.random` inside a run's async context. Frames with `node:` specifiers (the undici transport behind global `fetch`, timers, stream internals) are now classified as library provenance alongside `node_modules`, eliminating the false `RULVAR_BARE_DATE_NOW` observed at `processResponseEndOfBody` during in run `fetch` calls. Direct calls from workflow files still warn exactly once per run.

---
'@rulvar/core': minor
---

The synthesis reserve lifecycle decision now journals BEFORE the finish-validation termination throw (RV402, the eighth comparison experiment): a synthesis the validators terminally reject was still paid for out of the released reserve, and the run now keeps the frozen configured/held/released/remaining/consumed record on that failure path exactly as on success, idempotently across resume. Docs drift closed alongside: the FAQ now says the subprocess and container executors ship in `@rulvar/executor` instead of calling them a plan, the workflow guide no longer promises deadlines on approval suspensions (escalations only, per the durability table), the server guide scopes the approved tool's "exactly once" to its continuation segment under the documented at-least-once tool window, the RunMeta.argsHash doc points at `security.argsHashSalt` as the salted HMAC option, and the ctx dispatch comment names the full five-part idempotency key.

---
'@rulvar/cli': patch
---

Close a resume args-gate bypass through JSON numeric overflow (v1.24.0 review P2-1). A `--args` value that overflowed JavaScript's finite range (`1e400` parses to `Infinity`) could not be canonicalized, so genesis recorded the args binding with `argsProvided` but no hash, and a later `resume` supplying entirely different args slipped past the gate with only a warning, silently changing the logical run and re-paying every args-dependent call. `rulvar run` and `rulvar resume` now reject non-finite (non-JCS) `--args` at parse time, before any config, store, or adapter loads. Independently, when a run recorded `argsProvided` without a verifiable hash (an in-process host that started it with genuinely non-JCS args), a `resume` supplying args is now a typed refusal unless you pass `--allow-args-change`, instead of the previous soft warning. Core engine policy is unchanged: in-process hosts may still pass non-JCS args and record presence without a hash.

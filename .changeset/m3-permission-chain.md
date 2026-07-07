---
'@lurker/core': minor
---

M3-T03 permission chain and ask suspensions. The normative layered chain
(hooks -> deny rules -> ask rules -> canUseTool -> terminal default) is
the single approval surface for every tool dispatch; hooks run in
deterministic registration order with modifiedInput substitution; rules
never yield allow; an explicit canUseTool allow is decisive including
over needsApproval; argv/domain rules and presets fail early until M5.
Engine-wide defaults.permissions merges under profile permissions;
inheritPermissions is carried as data for subagent spawning (mode c).
An ask verdict journals a suspended approval entry (kind 'approval',
identity {toolName, post-hook input}, agent child scope) together with
the turn checkpoint; the run settles 'suspended' with the synthesized
approval:<seq> key; RunHandle.resolveExternal validates
{ decision: 'allow' | 'deny' } and a denial surfaces to the model as an
error tool result carrying the reason. An approval round-trip across
process exit resumes the SAME turn: executed tool results are reused
from the checkpoint, the resolved decision applies without
re-suspension, and only post-approval turns are paid live.

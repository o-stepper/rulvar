---
'@rulvar/core': minor
---

Pin a profile's toolset with an attestation and refuse drift typed at spawn time (RV1514, the P1 tail).

Provider-side drift of an imported tool's description or schema re-keys new spawns silently by design, so a poisoned MCP tool description still reached the model, just under a new content key. `AgentProfile.toolsetAttestation` now pins the hash itself: a spawn whose resolved toolset hashes to anything else refuses with a typed `ConfigError` before any provider call or budget admission. `attestToolset()` records the pin from a resolution (the aggregate `toolsetHash` plus per-tool `toolContractHash` values, both exported), and the refusal names the drift (`changed` / `missing` / `unexpected` tools with both hashes) when the per-tool hashes are present, or lists the resolved per-tool hashes so a stale pin can be corrected from the refusal itself. The pin binds the spawn's RESOLVED toolset, so a call-level tools override and the opt-in escalate tool drift it deliberately; the attestation shape is validated at `createEngine` (64 lowercase hex chars, tool names inside the tool-name pattern), and unattested profiles keep today's re-keying behavior byte for byte.

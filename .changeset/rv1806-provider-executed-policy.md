---
'@rulvar/bridge-ai-sdk': minor
---

Provider-executed tools become a policy surface, denied by default (RV1806). The bridge used to absorb a wrapped provider's server-side tool exchanges (web search, code execution) silently into retention: calls that never pass the engine's `ToolDef` registry, risk classes, ask rules, or approvals, with effects on provider infrastructure no permission chain can see. Under the new default `providerExecutedTools: 'deny'` the first provider-executed exchange fails the turn with a typed terminal error naming the tool; `'allow'` opts back into the old retention behavior and additionally names every provider-executed call on the finish metadata (`providerExecutedTools: [{ toolName, toolCallId }]`), so the journaled record of the turn says what the provider ran. Hosts that relied on the silent absorption must now pass `bridgeAiSdk(model, { providerExecutedTools: 'allow' })`; a malformed value refuses typed at construction.

---
'@lurker/core': minor
'@lurker/openai': minor
---

M3-T05 worktree isolation and M3-T06 openaiCompatible. GitWorktreeProvider
implements the IsolationProvider seam: acquire creates a detached
worktree from HEAD or a given ref (non-git host is a typed ConfigError),
tools receive cwd inside the tree, collect() snapshots changed files and
a binary patch, dispose removes the tree with keepOnError retention
under the shared maxPinnedWorktrees cap (default 4). ctx.agent resolves
isolation call-over-profile into spawn identity, stores the collected
patch in TranscriptStore, and surfaces it as a kind 'patch' Artifact on
AgentResult.artifacts and the terminal journal entry, so replays
reconstruct artifacts with zero live calls; applying the patch stays
with the caller. isolation 'readonly' is accepted as a declaration (its
compiled deny rule ships with risk presets in M5).

@lurker/openai gains openaiCompatible({ id, baseURL, apiKey?, caps? })
for Ollama, vLLM, and gateways: the Chat Completions dialect by
construction, explicit ids so several endpoints coexist (duplicate id
stays a ConfigError at createEngine), and the most conservative caps
when unprobed (prompt-tier structured output, no parallel tools, no
pricing; supplied caps merge over the floor).

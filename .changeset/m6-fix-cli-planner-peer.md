---
'@lurker/cli': patch
---

Drop the @lurker/planner peer declaration from the CLI: the plan command loads the planner DYNAMICALLY and reports a clear error when it is not installed, and a workspace peer dependency would major-cascade the whole fixed group on every planner bump under the changesets peer-dependents rule (0.6.0 would have released as 1.0.0 instead of 0.7.0).

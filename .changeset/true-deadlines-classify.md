---
'@rulvar/core': patch
---

The RV3205 discovery-deadline rewrap classifies by the SDK's request-timeout code instead of re-checking the wall clock: the re-check raced the SDK's own timer by a millisecond on a slow runner and leaked the raw `MCP error -32001` where the deadline vocabulary was promised.

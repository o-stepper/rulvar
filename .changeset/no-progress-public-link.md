---
'@rulvar/core': patch
---

The no-progress abort message now links the public docs (https://docs.rulvar.com/guide/agents#the-agent-loop-and-turns) instead of the retired internal spec reference "docs/06 Appendix A". Runtime-visible errors reference public documentation only. The stall-streak cassette embedding the message was re-recorded byte-for-byte otherwise; hashVersion stays 2, but the fixture lock refresh requires the hashVersion-bump token.

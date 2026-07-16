---
'@rulvar/planner': patch
---

Export `RunPlannedOptions` from the package barrel (v1.12 follow-up review, P2). The interface appears in the public `runPlanned` signature but was missing from the explicit type export list of `index.ts`, so a named type import from `@rulvar/planner` failed with TS2459 and the generated API docs rendered the name as unlinked text with no interface page. Runtime behavior is unchanged. The docs build now escalates any TypeDoc referenced-but-not-included warning outside a frozen baseline of pre-existing internal helper types, so a public type missing from its barrel fails CI instead of shipping.

---
'@rulvar/core': patch
---

RV4411: plan hygiene. The docs and RFCs that said "plan 44 scope" about the effects/admission runtime now name the dedicated effects plan (plan 45): plan 44 answered the seventh comparison experiment instead, and a published scope pointer must follow the plan it points at. A pnpm pin guard (`scripts/assert-pnpm-pin.mjs`, `pnpm run guard:pnpm-pin`) runs before every CI Turbo fan-out: one loud line naming the running pnpm, the packageManager pin, and the launch path, instead of the per-child version-mismatch death the RV4306 bootstrap job documents; the RV4306 behavioral gates stay the authority, and the un-enabled Corepack path stays the documented trap this guard names rather than adopts. The release contract gate keeps its documented consumption (the one-time legacy green line was spent by v1.248.0; the next release reads a fresh classification artifact from the always-recording contract-tests workflow).

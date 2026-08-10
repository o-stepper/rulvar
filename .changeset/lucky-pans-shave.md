---
'@rulvar/cli': minor
---

The human report says what the terminal CLAIMS, not only what it
transported (RV2703).

`rulvar run` printed the transport status, the value, the error, the
drops, the suspensions and the money, and not one semantic field. So a
run accepted with degradation, a run whose declared finish contract
refused every candidate it was handed, and a clean run all printed
`status: ok` with nothing between them. `--strict` has read those
fields since RV2604, but strict is the machine gate: a person who does
not pass the flag was left with exactly the blindness the last two
releases went into curing.

The report now names `completion:` with the degraded reasons behind it,
`deliverable:` (accepted or REFUSED by the declared contract, and
whether the terminal carries an artifact at all), the count of rejected
finish candidates with the distinct documents among them, and
`children at failure:` for a run that died before any policy judged its
roster (RV2602), which is the only account of work that was already
paid for.

`rulvar inspect` gains the offline half: the `completion` its own
`lastRunSettle` read has been available since the persisted-terminal
tail, while inspect printed the acceptance DECISION only, which exists
only where a verdict was rendered. A run that died before acceptance,
or one resumed past it, showed a reader nothing.

Absence prints nothing, everywhere (RV1209): a host that declares no
contract is its own judge, and a workflow that makes no completion
claim is not an incomplete run. A run with none of these fields prints
exactly what it printed before.

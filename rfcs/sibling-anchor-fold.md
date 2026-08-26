# RFC: the sibling anchor fold

Status: DRAFT (RV4709, plan 47). Design only; no runtime ships with this document, and
code lands only after this RFC survives review. The doctrine at stake is the citation
audit's verdict vocabulary (RV4004/RV4208): whether a judged `unsupported` may be
softened by evidence that lives in the SAME clause under a DIFFERENT anchor, or whether
the row's verdict is the row's alone and the kinship belongs in the meta.

## 1. Problem and evidence

The census rejudge of the seventh comparison experiment's frozen candidate (145 rows,
one judge invocation, verdicts recovered row by row) surfaced a texture the sample
never showed at scale:

1. Row 24: a clause cites `planner.md:8` and `planner.md:72` for one claim half each.
   The judge rules the `:8` anchor `unsupported` (the cited lines carry the heading,
   not the claimed behavior) while the SIBLING `:72` anchor of the same clause is
   `supported` and carries the very content the clause asserts. The document's claim
   is grounded; one of its two anchors is not.
2. The 26 `partial` verdicts of the same census show the mirrored texture: compound
   clauses whose halves split across two anchors, each anchor carrying its own half
   and judged against the whole clause's meaning. Under resolver v2 the clause
   splitting (RV4208) already narrows most of this, but paired anchors inside ONE
   clause still divide labor the per-row verdict cannot see.

The cost of the blindness is not judge error: the C1 rejudge measured zero judge
errors over honest windows across all thirteen baseline unsupported rows. The cost is
REPORTING shape: a fail-closed gate armed on `unsupported` rows (`onFound: 'fail'` or
the RV4406 repair pool pricing) counts a grounded-claim-with-a-sibling exactly like a
fabricated citation, and a repair round spends its bounded budget moving an anchor
whose clause is already grounded next door.

## 2. The two designs under review

Design A, verdict softening: when a row judges `unsupported` and ANOTHER anchor of the
same clause judges `supported`, the fold demotes the row to `partial` and stamps
`siblingSupported: { anchor, row }` on it. The gate arithmetic then treats the row as
the half-carried claim it is.

Design B, meta marking only: the verdict stands untouched; the fold stamps the same
`siblingSupported` marker on the row and a `siblingSupportedRows` count on the meta,
and every gate keeps its current arithmetic. Consumers that want the softer reading
opt in by reading the marker.

## 3. The doctrine argument

Design A edits a judged verdict in post, which the whole audit architecture has so far
refused to do: `parseCitationVerdicts` enforces a strict bijection precisely so that
no fold can invent or amend a verdict (RV4402), and the C1 evidence says the judge is
not the component that errs. A softened verdict also changes gate behavior for every
armed config the day it ships, which is a semantics change to `onFound: 'fail'`
postures that never asked for it.

Design B is byte-additive: rows without the texture keep their bytes, gates keep their
arithmetic, and the marker gives the repair prompt and the census reader the kinship
fact they currently reconstruct by hand. Its cost is that the fail-closed pain the
seventh and eighth experiments actually felt (a repair round consumed on sibling
textures, RV4705's ledger) remains until a gate opts into reading the marker.

The current lean is Design B first (the marker is true under both designs and blocks
neither), with Design A revisited only if a live run shows a gate refusing a document
whose every unsupported row carries a supported sibling. Counting the marker in the
repair round's PROMPT (so the composer fixes sibling rows by deleting the redundant
anchor instead of hunting new lines) is in scope for B and costs no verdict change.

## 4. What this RFC does not touch

The judge prompt and schema keep their bytes; the sample and census row derivations
keep theirs; `auditedHash` recipes are untouched. The N-case citation convention of
the eighth experiment (sections 11..12 citing the attacked guard, plan 47 wave B1) is
prompt doctrine, not fold mechanics, and stays out of scope here.

/**
 * The one sentence scope every claim-level check in the orchestrator
 * judges in (RV1212, RV1301). Internal on purpose: it is shared so the
 * finish validators and the contradiction pass can never drift into two
 * definitions of "the same sentence", not because a host needs it.
 *
 * Only `.!?` terminate. A colon or a semicolon does NOT, because the
 * values these checks read are written as `attempts: 3` and splitting
 * there would tear a claim away from the citation that supports it.
 */
export function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n{2,}|\n(?=\s*[-*#])/u);
}

/**
 * @lurker/lurker: lurker umbrella package: re-exports @lurker/core, both first-class adapters, the file store, and the terminal progress renderer. Published as @lurker/lurker while the unscoped name is contingent (docs/13, section "Naming risk note").
 *
 * M0 scaffold (v0.1.0): no public API yet. The first real surface of this
 * package ships in milestone M1 per docs/10-implementation-plan.md.
 */

/**
 * Temporary M0 scaffold marker (M0-T02 acceptance: a sample exported symbol
 * round-trips through build and packs). Removed when the package's first
 * real API lands.
 */
export const M0_SCAFFOLD = '@lurker/lurker' as const;

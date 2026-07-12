/**
 * @rulvar/compat: frozen KeyDeriver profiles for hashVersions that left
 * the support window, attached via EngineOptions.extraDerivers, the only
 * window extender (independently versioned, the sole lockstep
 * exemption). Window rules: https://docs.rulvar.com/guide/journal-compatibility.
 *
 * No real profile has aged out yet: this package ships the plumbing plus
 * a synthetic hashVersion 0 deriver used by the reject-version-too-old
 * cassette (M2-T05). Real derivers move in as versions retire.
 */
import { deriverV1, type KeyDeriver } from '@rulvar/core';

/**
 * Synthetic out-of-window profile for compatibility testing: hashVersion
 * 0 with the round-1 projection and table. NOT a historical profile.
 */
export const deriverV0Synthetic: KeyDeriver = {
  ...deriverV1,
  hashVersion: 0,
};

export type { KeyDeriver } from '@rulvar/core';

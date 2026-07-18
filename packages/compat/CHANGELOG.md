# @rulvar/compat

Independently versioned (docs/12, section "Exemptions"): releases are
deliberate manual events, never lockstep bumps; this changelog is
maintained by hand.

## 0.1.1

- Packaging only: the published artifact now ships a README (purpose,
  install, `extraDerivers` usage, documentation links). `dist` is
  byte-identical to 0.1.0; no profile, export, or contract changed.
  The immutability manifest re-freezes on 0.1.1 after publish
  (`node scripts/compat-immutability.mjs --update`).

## 0.1.0

- M2-T05: extraDerivers plumbing plus the synthetic hashVersion 0
  deriver for the reject-version-too-old cassette. No real profile has
  aged out of the support window yet.

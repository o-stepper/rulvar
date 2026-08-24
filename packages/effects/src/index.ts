/**
 * @rulvar/effects: the effect lane runtime (plan 45, rfcs/effects.md).
 * Consumption semantics (the fold and the writer) live in @rulvar/core;
 * this package is the adapter seam, the provider capability matrix,
 * the crash-window dispatcher, the provider fakes, and (the reconciler
 * train) the sweep, receipt verification, and the kill point kit.
 * Hosts that do not run effects pay nothing for it.
 */
export * from './adapter.js';
export * from './dispatcher.js';
export * from './fakes.js';
export * from './receipts.js';
export * from './reconciler.js';
export * from './telemetry.js';
export * from './kit.js';

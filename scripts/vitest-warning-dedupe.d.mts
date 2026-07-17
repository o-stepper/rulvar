// Hand-written declarations for the plain-JS dedupe module so the
// vitest.config.ts import and the adversarial tests typecheck under
// strict NodeNext. Repo tooling only, never published.
export declare function memoFileName(code: string): string;

export declare function installRulvarWarningDedupe(options?: {
  memoDir?: string;
  writeMemo?: (path: string) => void;
}): () => void;

export declare function ensureRunScopedMemoDir(options?: {
  env?: Record<string, string | undefined>;
  mkdtemp?: () => string;
  onExit?: (listener: () => void) => void;
  remove?: (dir: string) => void;
}): string;

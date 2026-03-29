import type { CoverageV8Options } from 'vitest/config';

/**
 * Shared Vitest v8 coverage defaults for `@multitenant/*` workspace packages (Phase 6.1).
 * Per-package `vitest.config` merges this into `test.coverage`.
 */
export const multitenantCoverageDefaults: CoverageV8Options = {
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  reporter: ['text', 'text-summary'],
  /** Calibrated to current suites; tighten over time (Phase 6.1). */
  thresholds: {
    lines: 72,
    functions: 60,
    branches: 30,
    statements: 72,
  },
};

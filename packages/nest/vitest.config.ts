import { multitenantCoverageDefaults } from '../../configs/vitest-coverage-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      ...multitenantCoverageDefaults,
      thresholds: {
        ...multitenantCoverageDefaults.thresholds,
        lines: 55,
        statements: 55,
        functions: 25,
      },
    },
  },
});

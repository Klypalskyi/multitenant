import { multitenantCoverageDefaults } from '../../configs/vitest-coverage-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      ...multitenantCoverageDefaults,
      include: ['src/init.ts'],
      thresholds: {
        ...multitenantCoverageDefaults.thresholds,
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});

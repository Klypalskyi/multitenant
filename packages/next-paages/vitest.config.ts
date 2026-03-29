import { multitenantCoverageDefaults } from '../../configs/vitest-coverage-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      ...multitenantCoverageDefaults,
      exclude: [
        ...(multitenantCoverageDefaults.exclude as string[]),
        'src/types.ts',
        'src/withMarket.ts',
      ],
      thresholds: {
        ...multitenantCoverageDefaults.thresholds,
        lines: 45,
        statements: 45,
        functions: 30,
        branches: 30,
      },
    },
  },
});

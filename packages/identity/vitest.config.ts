import { multitenantCoverageDefaults } from '../../configs/vitest-coverage-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      ...multitenantCoverageDefaults,
      exclude: [...(multitenantCoverageDefaults.exclude as string[]), 'src/index.ts'],
    },
  },
});

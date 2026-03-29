import { multitenantCoverageDefaults } from '../../configs/vitest-coverage-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      ...multitenantCoverageDefaults,
      exclude: [
        ...(multitenantCoverageDefaults.exclude as string[]),
        'src/index.ts',
        'src/useMarket.ts',
        'src/MarketProvider.tsx',
        'src/*.js',
      ],
    },
  },
});

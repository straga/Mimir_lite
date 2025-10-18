import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude only the benchmark/exercise tests in testing/agentic
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/tools/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/testing/agentic/**', // Exclude benchmark/exercise tests
    ],
    // Pool configuration for test isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Coverage configuration
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/tools/**',
        '**/testing/**',
        '**/testing/agentic/**', // Exclude benchmark tests from coverage
        '**/*.config.*',
        '**/types/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
});

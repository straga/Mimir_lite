import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include only benchmark/exercise tests in testing/agentic
    include: ['**/testing/agentic/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    // Exclude the default excludes
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    // Pool configuration for test isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});

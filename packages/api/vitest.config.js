import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: ['test/**/*.test.js'],
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'services/**/*.js',
        'models/**/*.js',
        'controllers/**/*.js',
        'infraestructure/repositories/**/*.js'
      ],
      exclude: [
        '**/*.test.js',
        '**/node_modules/**'
      ],
      // Coverage thresholds (70-80% según AGENTS.md)
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    
    // Load environment variables
    env: {
      NODE_ENV: 'test'
    }
  }
});
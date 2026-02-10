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
        '**/node_modules/**',
        // Exclude trivial value objects and enums per api-testing skill
        'models/BookStatus.js',
        'models/ReadingSession.js'
      ],
      // Coverage thresholds (70-80% según AGENTS.md)
      // Applied only to services and models with business logic (per api-testing skill)
      // Controllers and repositories are not unit tested
      // Trivial value objects and enums are excluded
      thresholds: {
        'services/**/*.js': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        'models/Book.js': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Load environment variables
    env: {
      NODE_ENV: 'test'
    }
  }
});
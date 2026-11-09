module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        esModuleInterop: true,
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/db/seed.ts',
    '!src/db/migrate.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};

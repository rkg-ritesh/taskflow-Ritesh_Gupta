import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}

const configFn = createJestConfig(config)

// next/jest sets its own transformIgnorePatterns last, overriding ours.
// Unwrap the resolved config and re-apply after so jose (ESM-only) gets
// transformed by SWC instead of being required as raw ESM.
export default async () => {
  const resolved = await (configFn as () => Promise<Config>)()
  return {
    ...resolved,
    transformIgnorePatterns: ['/node_modules/(?!(jose)/)'],
  }
}

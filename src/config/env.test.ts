import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const firebase = {
  VITE_BACKEND: 'firebase',
  VITE_FIREBASE_API_KEY: 'k',
  VITE_FIREBASE_AUTH_DOMAIN: 'x.firebaseapp.com',
  VITE_FIREBASE_STORAGE_BUCKET: 'x.appspot.com',
  VITE_FIREBASE_APP_ID: '1:2:web:3',
}

describe('environment configuration', () => {
  it('defaults to the development environment with the mock backend', () => {
    expect(parseEnv({})).toMatchObject({ appEnv: 'development', isProduction: false, backend: 'mock', firebase: undefined })
  })

  it('reads the Firebase project for the environment', () => {
    const dev = parseEnv({ ...firebase, VITE_APP_ENV: 'development', VITE_FIREBASE_PROJECT_ID: 'wayfarer-dev' })
    const prod = parseEnv({ ...firebase, VITE_APP_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'wayfarer-prod' })
    expect(dev.firebase?.projectId).toBe('wayfarer-dev')
    expect(prod).toMatchObject({ isProduction: true, firebase: { projectId: 'wayfarer-prod' } })
  })

  it('recognises Firebase ids with a generated suffix', () => {
    expect(() => parseEnv({ ...firebase, VITE_APP_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'wayfarer-dev-c2efe' })).toThrow('must not use the dev project')
    expect(parseEnv({ ...firebase, VITE_APP_ENV: 'development', VITE_FIREBASE_PROJECT_ID: 'wayfarer-dev-c2efe' }).firebase?.projectId).toBe('wayfarer-dev-c2efe')
  })

  it('refuses a production build pointed at the dev project, and the reverse', () => {
    expect(() => parseEnv({ ...firebase, VITE_APP_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'wayfarer-dev' })).toThrow('must not use the dev project')
    expect(() => parseEnv({ ...firebase, VITE_APP_ENV: 'development', VITE_FIREBASE_PROJECT_ID: 'wayfarer-prod' })).toThrow('must not use the production project')
  })

  it('names every missing Firebase value at once', () => {
    expect(() => parseEnv({ VITE_BACKEND: 'firebase' })).toThrow(/VITE_FIREBASE_API_KEY[\s\S]*VITE_FIREBASE_PROJECT_ID/)
  })

  it('rejects an unknown environment name', () => {
    expect(() => parseEnv({ VITE_APP_ENV: 'staging' })).toThrow('Invalid environment configuration')
  })
})

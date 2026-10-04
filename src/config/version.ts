declare const __APP_VERSION__: string | undefined

/** The build this code came from: the short commit id on Vercel, `dev` locally. Stamped into crash reports and feedback. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'dev'

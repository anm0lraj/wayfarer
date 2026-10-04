# Release runbook: from the dev preview to a live beta

Everything in the code is built and tested on `stage-2-dev` against the development Firebase project. Going live is a
set of steps in your own accounts, then a merge. Do them in this order. Tick them off as you go.

Two environments, never shared: **development** (Vercel Preview from `stage-2-dev`, Firebase `wayfarer-dev-c2efe`) and
**production** (Vercel Production from `main`, Firebase `wayfarer-prod…`). Secrets are Vercel *Sensitive* variables, set
separately for each scope, and are never pasted into chat, files or the repository.

## 0. Before you start

- [ ] The latest `stage-2-dev` preview works end to end: sign in, create a trip, add a photo, publish and open the link,
      "Send a test" notification, send feedback, assistant reply. (Use a throwaway Google account for account deletion.)
- [ ] GitHub CI is green on `stage-2-dev` (checks, emulators, e2e). The Firefox/WebKit job may be red: read it, it has never run before.
- [ ] You decided who the beta is for and how they get the link (section 9).

## 1. Create the production Firebase project

In the [Firebase console](https://console.firebase.google.com):

1. **Add project** → name it `wayfarer-prod`. Google adds a suffix to the id (for example `wayfarer-prod-4f2a1`); that is fine,
   it only has to contain `-prod`. Turn Google Analytics **off** (the app does not use it).
2. **Build → Firestore Database → Create database**: edition Standard, location **`asia-south1` (Mumbai)**. The region cannot be
   changed later. Start in *production mode* (the rules are deployed in step 2).
3. **Build → Authentication → Get started → Google**: enable it, choose a support email. Under *Settings → Authorized domains* add
   your production domain (and the `*.vercel.app` production URL if you will use it).
4. **Project settings → General → Your apps → Web app** (`</>`): register `Wayfarer`; copy the config values (apiKey, authDomain,
   projectId, storageBucket, messagingSenderId, appId). These are public configuration, not secrets.
5. **Project settings → Cloud Messaging → Web configuration → Web Push certificates → Generate key pair**: copy the public key.
6. **Project settings → Service accounts → Generate new private key**: keep the downloaded JSON for step 3; do not commit it.
7. Google Cloud console for the same project, **APIs & Services → OAuth consent screen**: if the publishing status is *Testing*,
   only listed test users can sign in. For a beta open to anyone with the link, set it to **In production** (the basic profile
   and email scopes need no verification).
8. In the repo set `.firebaserc` → `projects.prod` to the real project id (only if Google added a suffix).

## 2. Deploy the security rules and indexes to production

```bash
npx firebase login
npx firebase deploy --only firestore --project prod
```

Indexes take a few minutes to build (Firestore console → Indexes: all "Enabled"). Until then the public feed returns an error.
Check the rules were published: Firestore → Rules shows today's date.

## 3. Vercel Production environment variables

Vercel → project → Settings → Environment Variables → add each for **Production only**.

| Variable | Kind | Value |
|---|---|---|
| `VITE_APP_ENV` | config | `production` |
| `VITE_BACKEND` | config | `firebase` |
| `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | config | from step 1.4 (the project id must contain `-prod`; a build that mixes dev and prod values refuses to start) |
| `VITE_FIREBASE_VAPID_KEY` | config | the key from step 1.5 |
| `VITE_AI` | config | `live` |
| `VITE_WEATHER`, `VITE_ROUTING` | config | `live` (free services: see section 7 before real launch) |
| `VITE_CONTACT_EMAIL` | config | the address people can write to about their data (shown in the privacy notice) |
| `FIREBASE_SERVICE_ACCOUNT` | **secret** | the whole JSON file from step 1.6 |
| `CRON_SECRET` | **secret** | a new long random string (not the dev one) |
| `GEMINI_API_KEY` | **secret** | a **separate** key for production; use a paid-tier key before real people rely on it (the free tier may use prompts to improve Google's products) |
| `AI_DAILY_LIMIT` | config | optional, credits per person per day (default 20) |

The preview scope keeps its own values. Never copy a secret between scopes.

## 4. Domain and hosting plan

- [ ] Vercel **Hobby is non-commercial only**. Upgrade to **Pro** before any commercial use.
- [ ] Add your domain (Vercel → Domains) and add it to Firebase Authorized domains (step 1.3).
- [ ] Vercel → Settings → Security: add a rate-limit rule for `/api/*` (Pro), keep Production variables Sensitive.

## 5. GitHub settings

- [ ] Settings → Secrets and variables → Actions: variable `PUSH_SWEEP_URL` = `https://<production domain>/api/push/sweep`;
      secret `CRON_SECRET` = the same value as in Vercel Production. (Without them the 10-minute reminder sweep stays idle.)
- [ ] Settings → Branches → protect `main`: require the CI jobs `checks`, `emulators`, `e2e`; require a pull request.
- [ ] Settings → Code security: enable secret scanning with push protection, and Dependabot alerts.

## 6. Ship it

1. Open a pull request `stage-2-dev` → `main` and wait for CI to pass.
2. Merge. Vercel builds Production from `main` (a few minutes). The daily 08:00 IST reminder cron comes with that deployment.
3. **Smoke test the live site:**

   ```bash
   npm run smoke -- https://<production domain> --project <your prod project id>
   ```

   Every line must be a tick. It checks the pages and files, security headers, that the build points at the production project
   and not the dev one, and that the server functions answer and refuse strangers.
4. **Walk through it once by hand** with a real Google account that is not your dev test account: sign in, create a trip,
   add a photo, publish it and open the link in a private window (the link preview too: paste it in a chat), allow
   notifications and press "Send a test", send feedback, ask the assistant. Then check the Firebase console (production project)
   shows the trip, the media, the device record and the feedback.
5. Delete that test account from Settings and confirm its data is gone from Firestore.

## 7. Before real, unrestricted use

These are free or demo services fine for a small beta, but not for a public launch. See `docs/SECURITY.md` for the full list.

- [ ] Replace the OpenStreetMap tile server, the OSRM demo server and Open-Meteo's free tier with services you may use commercially.
- [ ] Turn on **Firebase App Check** for Firestore and Authentication.
- [ ] Set **budget alerts** on the production Google Cloud project (50 / 90 / 100 %) and a quota cap on the Gemini key.
- [ ] Have the privacy notice and terms reviewed for your own situation (India's DPDP Act), then update the date in `features/legal/routes.tsx`.
- [ ] Enable Firestore **point-in-time recovery** or scheduled backups (needs the Blaze plan): there are none by default, and account deletion is permanent.

## 8. After launch: where to look

| Question | Where |
|---|---|
| Is the site up and the build the right one? | `npm run smoke -- <url> --project <id>`; Settings shows the version (commit id) |
| Crashes, blocked resources | Vercel → Logs, search `report`. **Hobby keeps logs for about an hour and Pro a day**, so look soon after a release or connect a log drain |
| What do users say? | Firebase console → Firestore → `feedback` collection (each has the page and app version) |
| Is push working? | Settings → Notifications → "Send a test"; Vercel Logs for `/api/push/sweep`; GitHub → Actions → "Push sweep" |
| Assistant failing? | Vercel Logs for `/api/ai/*` ("AI provider failed" lines have the provider's status only) |
| Cost | Firebase → Usage; Google Cloud → Billing; Gemini quota page |

## 9. Running the beta

- Share the production link with a small group first (10 to 20 people) and ask for feedback through Settings → Send feedback.
- Anyone with the link can sign in with Google. If you want to limit it, the simplest options are to keep the OAuth consent
  screen in *Testing* with a list of test users (up to 100), or to ask me to add an email allow-list to the rules.
- Read feedback and the logs every day for the first week; fix what is broken before inviting more.

## 10. Rollback and incidents

- **A bad deploy**: Vercel → Deployments → pick the last good one → *Promote to Production* (instant, no rebuild).
- **Bad rules**: `git checkout <good sha> -- firestore.rules && npx firebase deploy --only firestore:rules --project prod`.
- **Push misbehaving**: remove the `CRON_SECRET` variable in Vercel Production (the sweep then answers 503 and sends nothing) and
  disable the GitHub workflow; devices are untouched.
- **Assistant out of control or too costly**: set `AI_DAILY_LIMIT` to `1`, or remove `GEMINI_API_KEY` (the assistant then says it is unavailable).
- **A key leaked**: rotate it right away (below), then look at the usage graphs for the period it was exposed.

### Rotating secrets (every 6 months, and whenever someone with access leaves)

1. Service account: Firebase → Service accounts → generate a new key → replace `FIREBASE_SERVICE_ACCOUNT` in Vercel → redeploy →
   check "Send a test" works → delete the old key in Google Cloud → IAM → Service accounts → Keys.
2. `CRON_SECRET`: set the new value in Vercel and in the GitHub secret together, redeploy.
3. `GEMINI_API_KEY`: create a new key, replace it in Vercel, redeploy, delete the old key.

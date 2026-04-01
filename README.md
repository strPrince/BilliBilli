<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f2996812-444e-4f4a-a966-454ba6a7e6d2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android PWA (Works Offline)

This project is configured as a Progressive Web App (PWA) using `vite-plugin-pwa`.

1. Build and preview the production app:
   `npm run build`
   `npm run preview`
2. Open the preview URL from your Android phone (same network or deployed URL).
3. In Chrome on Android, tap `Add to Home screen` / `Install app`.
4. Open the installed app at least once while online so assets are cached.
5. After that, the app shell and local data (Dexie/IndexedDB) continue to work without internet.

Notes:
- PWA installation on Android requires `https` (or `localhost` during local testing).
- Features that call external APIs (for example Gemini requests) still need internet.

## Deploy To Vercel

This repo is now configured for Vercel with [vercel.json](/vercel.json).

1. Push this project to GitHub.
2. In Vercel, click `Add New -> Project` and import the repo.
3. Build settings:
   `Build Command`: `npm run build`
   `Output Directory`: `dist`
4. Add environment variable in Vercel project settings:
   `GEMINI_API_KEY` = your key
5. Deploy.

After deploy, your app runs on HTTPS, so Android PWA install should be available.

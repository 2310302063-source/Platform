# 🚀 Deployment Fix Guide
## Firebase Hosting (Frontend) + Railway (Backend)

---

## ❌ What Was Broken

Your Railway deployment was failing with `ERR_MODULE_NOT_FOUND` because:

1. `railway.json` build command was only running `npm install` — **TypeScript was never compiled**
2. Both `railway.json` and `Dockerfile` tried to run `backend/server-production.js` — **this file doesn't exist**
3. The compiled output from `tsc` would be `backend/server.js`, not `server-production.js`
4. `package.json` was also missing `@types/express` and other `@types/*` packages needed for compilation

---

## ✅ Files to Update in Your Repo

Replace these files with the fixed versions provided:

| File | What Changed |
|------|-------------|
| `railway.json` | Build command now runs `tsc`, start command points to correct `server.js` |
| `Dockerfile` | Compiles TypeScript before pruning devDeps |
| `nixpacks.toml` | **NEW** — explicit Railway build phases (more reliable) |
| `package.json` | Added missing `@types/*` packages, fixed scripts |
| `backend/tsconfig.json` | Ensure outDir outputs compiled JS to `backend/` folder |

---

## 📋 Step-by-Step: Apply Fixes Locally

```bash
# 1. Go to your project
cd D:\platform

# 2. Replace the files with the fixed versions (copy from this guide)

# 3. Verify backend/tsconfig.json has outDir set correctly
# It should compile server.ts → server.js in the same backend/ folder

# 4. Test the build locally first
npm install
npm run build:backend

# Check that backend/server.js now exists:
ls backend/server.js   # (or dir backend\server.js on Windows)

# 5. Commit and push
git add .
git commit -m "fix: Railway deployment - compile TypeScript before start"
git push origin main
```

---

## 🔧 Railway Environment Variables

In your Railway dashboard → your service → **Variables**, add:

```
NODE_ENV=production
PORT=8080

# Firebase Admin (get from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=ndidi-8d9fc
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ndidi-8d9fc.iam.gserviceaccount.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Optional - only if you're using these
STRIPE_SECRET_KEY=sk_live_...
REDIS_URL=redis://...
```

---

## 🌐 Step-by-Step: Firebase Hosting (Frontend)

```bash
# 1. Install Firebase CLI (if not already)
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Build frontend
npm run build:frontend

# 4. Update src/config/firebase.ts or .env.local
# Set your Railway backend URL:
VITE_BACKEND_URL=https://your-app.up.railway.app

# 5. Deploy to Firebase
firebase deploy --only hosting
```

Your Firebase frontend URL will be:
`https://ndidi-8d9fc.web.app`

---

## 🔗 Connecting Frontend → Backend

In your frontend code, make sure API calls point to your Railway URL.
In your `.env.local` (and set same in Firebase Hosting environment):

```env
VITE_API_URL=https://your-railway-app.up.railway.app
```

In Railway dashboard, also set:
```
CORS_ORIGIN=https://ndidi-8d9fc.web.app
```

---

## 🧪 Verify Everything Works

1. Railway backend health check: `https://your-app.up.railway.app/health`
2. Firebase frontend: `https://ndidi-8d9fc.web.app`
3. API from frontend reaching backend: Check browser Network tab

---

## 🐛 If Railway Still Fails

Check the Railway build logs for the exact line. Common follow-up issues:

- **`Cannot find module 'express'`** → Make sure `express` is in `dependencies` (not devDependencies) ✅ it is
- **`firebase-admin` import error** → Add `FIREBASE_*` env vars in Railway dashboard
- **Port binding error** → Make sure your `server.ts` uses `process.env.PORT || 8080`

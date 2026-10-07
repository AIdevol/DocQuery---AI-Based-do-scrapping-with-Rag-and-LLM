# Permanent Live Deployment Guide (Netlify + Permanent Backend)

This guide provides everything you need to keep your **Universal File Q&A AI Workspace** permanently online with a **fixed backend URL that never changes**.

---

## 🔍 Why Did the Backend URL Keep Changing?

When you run `./start.sh` with default ngrok or Cloudflare quick tunnels (`trycloudflare.com`), they assign a **temporary, random URL** on every reboot (e.g., `https://shops-revenues-veteran-consult.trycloudflare.com` &rarr; `https://abc-xyz-123.trycloudflare.com`).

Whenever the tunnel restarts, your Netlify frontend breaks because it is still pointing to the expired tunnel URL.

Below are the permanent solutions to fix this once and for all.

---

## 🏆 Solution 1: Deploy Backend to Render (Recommended & 100% Free 24/7)

Deploying the Node.js backend to **Render.com** gives you a **permanent HTTPS URL that never changes** (e.g. `https://docuquery-backend.onrender.com`), and it runs 24/7 in the cloud without needing your laptop to stay open.

### Step 1: Push Project to GitHub
```bash
git init
git add .
git commit -m "feat: permanent deployment configuration"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

### Step 2: Create Web Service on Render
1. Go to [https://render.com](https://render.com) and sign in (Free).
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `docuquery-backend` (or any name you choose)
   - **Environment**: `Node`
   - **Plan**: `Free`
   - **Build Command**: `npm run build:server`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.
6. Render will deploy your server and give you a permanent URL:
   ```
   https://docuquery-backend.onrender.com
   ```

---

## 🌐 Connecting Netlify to Your Permanent Backend

Once you have your permanent backend URL from Render, you have two simple ways to link Netlify to it:

### Method A: Set Netlify Environment Variable (`VITE_API_URL`)
1. In your Netlify Dashboard, navigate to your site.
2. Go to **Site configuration** &rarr; **Environment variables**.
3. Click **Add a variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://docuquery-backend.onrender.com`
4. Trigger a new deploy (**Deploys** &rarr; **Trigger deploy** &rarr; **Clear cache and deploy site**).

### Method B: Netlify API Proxy via `netlify.toml` (Zero-CORS)
In `netlify.toml` and `client/netlify.toml`, uncomment the redirect block:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://docuquery-backend.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
With this rule, Netlify forwards all `/api/*` calls directly to your backend on the server side. You don't need any CORS configuration or environment variables!

---

## ⚡ Option 2: Deploy Frontend to Netlify

### Option A: Netlify Drop (30-second manual upload)
1. Build the production client bundle:
   ```bash
   npm run build
   ```
2. Open [https://app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist` folder into Netlify.
4. Your frontend is live instantly!

### Option B: Automatic Continuous Deployment (Git-connected)
1. In Netlify, click **Add new site** &rarr; **Import an existing project** &rarr; **GitHub**.
2. Select your repository.
3. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Under **Environment variables**, add:
   - `VITE_API_URL`: `https://docuquery-backend.onrender.com`
5. Click **Deploy Site**.

---

## 💻 Option 3: Permanent Static Ngrok Domain (If Keeping Backend on Mac)

If you prefer running the backend on your own Mac rather than in the cloud:

1. **Claim 1 Free Static Domain on Ngrok**:
   - Log in at [https://dashboard.ngrok.com/cloud-edge/domains](https://dashboard.ngrok.com/cloud-edge/domains).
   - Ngrok gives 1 free permanent domain (e.g. `your-domain.ngrok-free.app`).
2. **Configure Your Project**:
   Create a `.env` file in the root directory:
   ```bash
   NGROK_DOMAIN=your-domain.ngrok-free.app
   ```
3. **Run `./start.sh`**:
   The script automatically binds to your permanent static domain every time:
   ```bash
   ./start.sh
   ```
4. **Set this URL in Netlify or Settings**:
   Save `https://your-domain.ngrok-free.app` in your Netlify site or in the in-app **Settings &rarr; Server** tab.

---

## 🛠️ In-App Connection Controls

1. **Top Navigation Status Indicator**:
   - When connected: Shows subtle **API Connected** badge.
   - When disconnected: Shows an amber **Backend Offline (Fix)** button that directly opens the Server configuration tab.
2. **Server Settings Tab**:
   - Shows active base URL and source:
     - `Browser Override (LocalStorage)`
     - `Netlify Env (VITE_API_URL)`
     - `Same-Origin Proxy (/api)`
   - **Test Connection**: Pings the backend, verifies JSON response (guards against HTML fallback errors), and reports latency in milliseconds.
   - **Reset / Clear Browser Override**: Clears stale temporary URLs from localStorage with one click.

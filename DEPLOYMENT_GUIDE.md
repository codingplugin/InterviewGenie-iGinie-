# 🚀 Deployment Guide (Render.com)

## Step 1: Push Code to GitHub
(Already started via terminal). Ensure all code including the `web-server` folder is on GitHub.

## Step 2: Create Render Web Service
1. Login to [Render.com](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub Repository (`InterviewGenie...`).
4. **Name**: `interview-genie-server` (or unique name).
5. **Region**: Singapore (or closest to users).
6. **Branch**: `main`.
7. **Root Directory**: `web-server` (⚠️ IMPORTANT).

## Step 3: Configure Build & Start
*   **Runtime**: Node
*   **Build Command**: `npm install`
*   **Start Command**: `node index.js`

## Step 4: Environment Variables (Advancd)
Click **"Add Environment Variable"** for each of these:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas Connection String (Ensure IP `0.0.0.0/0` is allowed in Atlas) |
| `JWT_SECRET` | `mySuperSecretLongString123!` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` (Use Live keys for real money) |
| `RAZORPAY_KEY_SECRET` | `...` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |

## Step 5: Update Google OAuth
Once deployed, Render gives you a URL (e.g., `https://ig-server.onrender.com`).
1. Go to Google Cloud Console.
2. Edit your OAuth Client.
3. Add **Authorized Redirect URI**: `https://ig-server.onrender.com/api/auth/google/callback`.

---

## ⚠️ CRITICAL: Desktop App Connectivity
The Setup currently builds the Desktop App to connect to `127.0.0.1` (Localhost).
**Users downloading the app from your live website won't be able to login unless you update the App.**

**Procedure to Fix App:**
1.  **Deploy Server** first (Steps 1-5).
2.  Copy your new **Render URL**.
3.  Go to `desktop-app/login.html` locally.
4.  Change `API_URL`:
    ```javascript
    const API_URL = 'https://ig-server.onrender.com/api/auth';
    ```
5.  **Rebuild Installer**: `npm run dist` (in `desktop-app`).
6.  **Copy Installer**: Copy the new `.exe` to `web-server/public`.
7.  **Push to GitHub**: `git add .`, `git commit`, `git push`.
8.  Render will auto-deploy the new website with the new installer.

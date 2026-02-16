# Setting up Threads OAuth

To allow users to log in with their Threads account, you need to set up a Meta App.

## 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps/).
2. Click **Create App**.
3. Select **"Use Cases"** > **"Threads"** (or "Other" > "Threads").
4. Fill in the App Name (e.g., "Threads Deleter") and Contact Email.
5. Create the app.

## 2. Configure Threads Product

1. In the App Dashboard, find **Threads** in the product list and click **Set Up**.
2. Go to **Threads > Settings**.
3. Scroll to **OAuth Settings**.
4. Add your Redirect URI: `http://localhost:3000/auth/callback`
   _(Or your production URL if deployed, e.g. `https://your-app.vercel.app/auth/callback`)_

## 3. Get Credentials

1. Go to **App Settings > Basic**.
2. Copy the **App ID** -> set as `THREADS_CLIENT_ID` in `.env`.
3. Click "Show" next to **App Secret**, copy it -> set as `THREADS_CLIENT_SECRET` in `.env`.

## 4. Add Testers (Important!)

While in Development mode, only users listed as testers can log in.

1. Go to **App Roles > Roles**.
2. Click **Add Testers**.
3. Enter the specific Threads username(s) you want to use.
4. The user must accept the invitation at [developers.facebook.com/requests](https://developers.facebook.com/requests).

## 5. Environment Variables

Ensure your `.env` file has these set:

```ini
THREADS_CLIENT_ID=your_app_id
# OR: THREADS_APP_ID=your_app_id

THREADS_CLIENT_SECRET=your_app_secret
# OR: THREADS_APP_SECRET=your_app_secret

THREADS_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Troubleshooting

### "An unknown error has occurred (error_code: 1)"

This generic error usually means one of the following:

1.  **Missing Credentials**: Ensure `THREADS_CLIENT_ID` and `THREADS_CLIENT_SECRET` are set in `.env` and the server was restarted.
2.  **Redirect URI Mismatch**: The URI in your code (`http://localhost:3000/auth/callback`) must **exactly match** the one in the App Dashboard > Threads > Settings.
    - Check for `http` vs `https`.
    - Check for trailing slashes.
3.  **App Mode**: If your app is in "Live" mode but you haven't completed App Review, switch to "Development" mode.
4.  **Tester Role**: In Development mode, the Threads account you are trying to log in with MUST be added as a "Tester" in **App Roles**.
5.  **Invalid Client ID**: Double-check that `THREADS_CLIENT_ID` matches the **App ID** in the dashboard.

### "Insecure Login Blocked" (Meta Requires HTTPS)

**Meta's App Dashboard no longer accepts `http://` for localhost.** You MUST use a secure HTTPS tunnel.

**The Fix: Use ngrok (Easiest Way)**

1.  **Run ngrok:**
    Run this command in a new terminal window to create a secure tunnel to your local server:

    ```bash
    npx ngrok http 3000
    ```

    _(If prompted, you may need to sign up for a free ngrok account and add your auth token)_

2.  **Copy the Forwarding URL:**
    Look for the line that says `Forwarding`. Copy the `https://...` URL.
    Example: `https://abcd-1234.ngrok-free.app`

3.  **Update .env:**
    Set `THREADS_REDIRECT_URI` to your ngrok URL + `/auth/callback`.

    ```ini
    THREADS_REDIRECT_URI=https://abcd-1234.ngrok-free.app/auth/callback
    ```

4.  **Update App Dashboard:**
    Go to **Threads > Settings** and update the **Redirect URI** to match EXACTLY:
    `https://abcd-1234.ngrok-free.app/auth/callback`

5.  **Restart Server:**
    Stop and restart `npm run start:web` to pick up the new `.env` value.
    Then open the **ngrok URL** in your browser to log in.

### Alternative: The "HTTPS Hack" (No ngrok required)

If you don't want to use ngrok, you can trick the process:

1.  Set `THREADS_REDIRECT_URI=https://localhost:3000/auth/callback` in `.env` and Dashboard.
2.  Start the server (`http://localhost:3000`).
3.  Click "Authorize". Meta will redirect you to `https://localhost...`.
4.  **Browser Error:** You will see a "Secure Connection Failed" or "Site can't be reached" error.
5.  **The Fix:** Go to your browser's address bar, change `https://` to `http://`, and hit Enter.
6.  You will be logged in successfully!

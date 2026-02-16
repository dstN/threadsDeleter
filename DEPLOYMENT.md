# Deploying to Vercel

This app is ready for push-to-deploy with Vercel.

## 1. Environment Variables

You must set these in your Vercel Project Settings (**Settings > Environment Variables**):

| Variable               | Description               | Example Value                                    |
| ---------------------- | ------------------------- | ------------------------------------------------ |
| `THREADS_APP_ID`       | Your Meta App ID          | `123456789`                                      |
| `THREADS_APP_SECRET`   | Your Meta App Secret      | `abcdef123456`                                   |
| `THREADS_REDIRECT_URI` | The full callback URL     | `https://threadsdelete.vercel.app/auth/callback` |
| `SESSION_SECRET`       | Random string for cookies | `make-up-a-long-random-string`                   |
| `NODE_ENV`             | Environment mode          | `production`                                     |

## 2. Meta App Configuration

Don't forget to update your **Meta App Dashboard**:

1. Go to **Threads > Settings**.
2. Add your Vercel URL to **Redirect Callback URIs**:
   `https://threadsdelete.vercel.app/auth/callback`
3. Configure **Data Deletion** and **Deauthorize** callbacks (required for Live mode):
   - **Deauthorize Callback URL**: `https://threadsdelete.vercel.app/auth/deauthorize`
   - **Data Deletion Request URL**: `https://threadsdelete.vercel.app/auth/data-deletion`

## 3. Deployment

1. Import this repository into Vercel.
2. Add the environment variables above during import.
3. Deploy!

## Known Limitations (Serverless)

Since this app uses in-memory sessions (no database):

- Sessions effectively expire if the serverless function "cold starts" (after 10-15m of inactivity).
- If you see "Session expired" or have to login frequently, this is why.
- For a personal tool, this is usually fine.

# Deploying the public synthetic demo (Vercel + Neon)

This puts the signed-in clinic app on the internet as a **public demo with synthetic data only**. Nothing real may ever be entered. Each night the database is wiped and re-seeded, and every visitor is signed out.

What the public demo mode (`PUBLIC_DEMO=1`) does:

- Sign-in is still required. Visitors use one of two shared demo logins (Maple pod, Cedar pod).
- Account changes are blocked (password, email, name, reset, delete, and all admin user-management). The "Admin accounts and pods" page is read-only.
- A banner on every page says "Public demo · synthetic data only · resets nightly".
- A secret-protected endpoint, `/api/demo/reset`, rebuilds everything. Vercel calls it every day at 07:00 UTC (about 03:00 in Toronto).

You need free accounts at GitHub (already done), [Neon](https://neon.tech) and [Vercel](https://vercel.com). You create and control these accounts yourself.

## 1. Create the Neon database

1. Sign in at neon.tech and click **New project**. Name it e.g. `clinic-demo`. Pick a region close to you (e.g. AWS US East).
2. On the project dashboard click **Connect**. Make sure **Connection pooling** is switched **on** (the host contains `-pooler`).
3. Copy the connection string. It looks like `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`. Keep it private; it is your `DATABASE_URL`.

You do not need to create any tables. The first reset call (step 5) creates them.

## 2. Generate your secrets

You need three random values. Run the command below three times (once per value) and keep them somewhere safe, such as a password manager.

- Bash / macOS / Linux / Git Bash: `openssl rand -base64 32`
- PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`

Use them as:

| Value | Used for |
|---|---|
| first | `BETTER_AUTH_SECRET` |
| second | `CRON_SECRET` |
| third (or pick a memorable passphrase, 8+ characters) | `DEMO_ADMIN_PASSWORD`, the shared demo password |

The sign-in page tells visitors the demo password is in the project README. The README does not contain it yet: the owner adds it there (the PM will do this) once the demo is live. Never put it in code or any committed file other than that README line.

## 3. Import the repository into Vercel

1. In Vercel click **Add New... > Project** and import `LesterYKTam/therapist-clinic-scheduling` from GitHub.
2. Set **Root Directory** to `agentic-clinic-starter-final/web` (click Edit and pick the folder).
3. **Framework Preset** should detect **Next.js**. Leave the build and install commands as they are.
4. Open **Environment Variables** and add these (apply to Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | the pooled Neon connection string from step 1 |
| `BETTER_AUTH_SECRET` | your first random value |
| `BETTER_AUTH_URL` | your public site URL, e.g. `https://clinic-demo.vercel.app` (see note) |
| `APP_URL` | the same URL as `BETTER_AUTH_URL` |
| `PUBLIC_DEMO` | `1` |
| `CRON_SECRET` | your second random value |
| `DEMO_ADMIN_PASSWORD` | your demo password (8+ characters) |

**Important: do NOT set `CLINIC_DEMO_MODE`.** That is a different, local-only switch that disables sign-in. The app refuses to run with it in production, and the reset endpoint refuses too.

Note on the URL: you do not know the exact address until Vercel creates the project. Use the name you chose (`https://<project-name>.vercel.app`), or deploy once, read the address Vercel shows, then add or correct `BETTER_AUTH_URL` and `APP_URL` under **Settings > Environment Variables** and **Redeploy**. Use `https://` with no trailing slash.

5. Click **Deploy** and wait for "Congratulations".

## 4. Check the cron job

In Vercel open **Settings > Cron Jobs**. You should see `/api/demo/reset` scheduled `0 7 * * *`. The schedule `0 7 * * *` means daily at 07:00 UTC, which is 03:00 Toronto time in summer and 02:00 in winter. Vercel automatically sends your `CRON_SECRET` as a bearer token. (The free Hobby plan allows a daily cron; its exact run time may vary by up to an hour.)

## 5. Bootstrap once (first-time setup)

The database is empty, so call the reset endpoint yourself once. Replace the URL and the secret (your `CRON_SECRET`).

Bash / Git Bash / macOS:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-SITE.vercel.app/api/demo/reset
```

PowerShell:

```powershell
Invoke-RestMethod -Uri "https://YOUR-SITE.vercel.app/api/demo/reset" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

Success returns JSON like `{"ok":true,"revision":1,"admins":[{"email":"maple@demo.clinic",...},{"email":"cedar@demo.clinic",...}],...}`. It never includes passwords.

Errors:

- `404` - `PUBLIC_DEMO` is not `1`, or `CRON_SECRET` is not set. Fix the variables and redeploy.
- `401` - the secret in your command does not match `CRON_SECRET`.
- `500` mentioning `DEMO_ADMIN_PASSWORD` - set it (8+ characters) and redeploy.
- `500` "Demo reset failed" - open Vercel **Logs** for the cause (usually a wrong `DATABASE_URL`).

## 6. Verify

1. Open your site. You should land on the sign-in page with the banner and the two demo emails.
2. Sign in as `maple@demo.clinic` with your demo password. You should see the Maple pod schedule.
3. Open `/config/admins`. It should be read-only.
4. Sign out, sign in as `cedar@demo.clinic`, and confirm you see the Cedar pod.
5. Open a therapist's monthly report and check that the PDF report downloads (this confirms the PDF font shipped with the deployment).
6. Optional: in the browser console, `fetch('/api/auth/change-password',{method:'POST'})` should answer 403.

## 7. The nightly reset

Every day Vercel calls `/api/demo/reset`. It: creates any missing tables, replaces the clinic data with fresh synthetic data (dates relative to the current day), deletes every user except the two demo admins, recreates those two with your `DEMO_ADMIN_PASSWORD`, and deletes all sessions (so everyone is signed out). To run it by hand any time, repeat step 5. To change the demo password, change `DEMO_ADMIN_PASSWORD`, redeploy, and call step 5 again (or wait for the nightly run).

## Troubleshooting

- **Sign-in works but you are bounced back**: `BETTER_AUTH_URL` or `APP_URL` does not exactly match the address in your browser.
- **"DATABASE_URL is not configured"**: the variable is missing for the Production environment; add it and redeploy.
- **Connection errors on busy days**: make sure you used the pooled Neon string (host contains `-pooler`).
- Stop the demo any time by pausing or deleting the Vercel project (do not just remove `PUBLIC_DEMO`, which would re-enable account management). Real client data must never be put in this demo.

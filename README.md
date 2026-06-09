# ClaimBridge CV

ClaimBridge CV is the first version of a commercial vehicle insurance claim assistance platform. This release includes the Supabase database foundation and a protected Next.js admin web portal. It does **not** include a customer mobile app.

## What is included

- `apps/web-portal` — Next.js, TypeScript, Tailwind CSS, Supabase Auth email/password login, middleware route protection, and role-gated admin pages.
- `supabase/migrations` — PostgreSQL schema, enums, indexes, RLS policies, Auth profile trigger, and private storage bucket setup.
- `supabase/functions` — Reserved for future Supabase Edge Functions.
- `docs` — Business flow, database schema, and security notes.
- `.env.example` — Environment variable template.

## Exact npm install command

Run this from the repository root:

```bash
npm install
```

## Exact command to run the admin portal locally

Run this from the repository root after installing dependencies and creating `apps/web-portal/.env.local`:

```bash
npm run dev
```

The portal is available at `http://localhost:3000`. Opening `/` redirects unauthenticated users to `/login` and authorized users to `/dashboard`.

## Required environment variables

The web portal uses only these public Supabase variables in browser/frontend code:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to frontend code, Vercel variables for the browser app, or any `NEXT_PUBLIC_` variable. The current portal does not require the service role key.

## Browser-only Supabase Auth setup

Use the Supabase dashboard; no CLI is required for the login setup.

1. Open your Supabase project in the browser.
2. Go to **Authentication → Providers → Email**.
3. Enable the **Email** provider.
4. For the simplest first admin login, enable email/password sign-ins. If email confirmation is enabled, make sure you can confirm the first admin user's email before testing Vercel.
5. Go to **Authentication → URL Configuration**.
6. Add your deployed Vercel URL to the allowed site/redirect URLs, for example:
   - `https://your-vercel-app.vercel.app`
   - `https://your-vercel-app.vercel.app/login`
7. Confirm the `profiles` table exists from the migration and has Row Level Security policies enabled.

## Browser-only Vercel environment variable setup

1. Open the Vercel project in the browser.
2. Go to **Settings → Environment Variables**.
3. Add exactly these variables for Production, Preview, and Development as needed:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Do not add `SUPABASE_SERVICE_ROLE_KEY` for this frontend portal.
5. Redeploy the site after saving the variables.

## Creating the first admin user in the browser

1. In Supabase, go to **Authentication → Users**.
2. Click **Add user**.
3. Enter the admin email and a strong password.
4. If your project requires confirmed emails, mark the user as confirmed or complete the email confirmation flow.
5. Copy the new user's UUID from the Auth user details page.

## Creating the matching `profiles` row with `super_admin`

The portal allows only active profiles with one of these roles: `super_admin`, `admin`, `manager`, `claim_processor`, or `field_executive`.

1. In Supabase, go to **Table Editor → profiles**.
2. Click **Insert row**.
3. Set:
   - `id` — the UUID copied from the Supabase Auth user.
   - `role` — `super_admin`.
   - `full_name` — the first administrator's name.
   - `is_active` — `true`.
4. Save the row.
5. If a trigger already created a profile row with `role = customer`, edit that row and change `role` to `super_admin` and `is_active` to `true`.

## Testing the deployed login

1. Open the deployed root URL, for example `https://your-vercel-app.vercel.app/`.
2. Confirm it redirects to `/login` when no user is logged in.
3. Sign in with the Supabase Auth email/password admin user.
4. Confirm the app redirects to `/dashboard`.
5. Open each protected route directly in a private/incognito window and confirm it redirects to `/login`:
   - `/dashboard`
   - `/customers`
   - `/vehicles`
   - `/policies`
   - `/claims`
   - `/documents`
   - `/timeline`
   - `/tasks`
   - `/reports`
   - `/users`
6. Test an Auth user with no `profiles` row, inactive profile, or invalid role and confirm the app shows the access denied page.
7. Use the sidebar/header **Logout** button and confirm a protected URL redirects back to `/login` after logout.

## Security principles

- The frontend may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never put the Supabase `service_role` key in frontend code or a `NEXT_PUBLIC_` variable.
- Admin routes are protected by Next.js middleware and Supabase Auth token validation.
- Admin authorization is validated against the `profiles` table, not hard-coded users.
- Claim documents are stored in a private bucket named `claim-documents`.
- Access to sensitive tables is controlled with Supabase Row Level Security.
- Important system changes should be recorded in `audit_logs`.

## Deployment notes

- Deploy `apps/web-portal` to Vercel or another Next.js host.
- Configure production environment variables in the hosting provider.
- Run Supabase migrations against production before enabling production traffic.
- Add server-side actions or Supabase Edge Functions later for privileged workflows that require the service role key.

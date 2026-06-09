# InsureIt

InsureIt is a commercial vehicle insurance claim assistance platform for managing customers, vehicles, policies, accident claim cases, supporting documents, follow-up tasks, reporting, and staff access in a secure admin portal.

## What is included

- `apps/web-portal` — Next.js, TypeScript, Tailwind CSS, email/password authentication, route protection, and role-gated admin pages.
- `supabase/migrations` — PostgreSQL schema, enums, indexes, Row Level Security policies, Auth profile trigger, and private storage bucket setup.
- `supabase/functions` — Reserved for future trusted server workflows.
- `docs` — Business flow, database schema, and security notes.
- `.env.example` — Environment variable template.

## Install dependencies

Run this from the repository root:

```bash
npm install
```

## Run the admin portal locally

Run this from the repository root after installing dependencies and creating `apps/web-portal/.env.local`:

```bash
npm run dev
```

The portal is available at `http://localhost:3000`. Opening `/` redirects unauthenticated users to `/login` and authorized users to `/dashboard`.

## Required environment variables

The web portal uses these browser-safe Supabase variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to frontend code, Vercel variables for the browser app, or any `NEXT_PUBLIC_` variable. The current portal does not require the service role key.

## Supabase Auth setup

Use the Supabase dashboard; no CLI is required for login setup.

1. Open your Supabase project in the browser.
2. Go to **Authentication → Providers → Email**.
3. Enable the **Email** provider.
4. Enable email/password sign-ins. If email confirmation is enabled, confirm the first administrator's email before testing the deployed portal.
5. Go to **Authentication → URL Configuration**.
6. Add your deployed Vercel URL to the allowed site and redirect URLs, for example:
   - `https://your-vercel-app.vercel.app`
   - `https://your-vercel-app.vercel.app/login`
7. Confirm the `profiles` table exists from the migration and has Row Level Security policies enabled.

## Vercel environment variable setup

1. Open the Vercel project in the browser.
2. Go to **Settings → Environment Variables**.
3. Add exactly these variables for Production, Preview, and Development as needed:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Do not add `SUPABASE_SERVICE_ROLE_KEY` for this frontend portal.
5. Redeploy the site after saving the variables.

## Creating the first admin user

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
3. Sign in with the email/password administrator user.
4. Confirm the app redirects to `/dashboard`.
5. Open each restricted route directly in a private/incognito window and confirm it redirects to `/login`:
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
6. Test a user with no `profiles` row, inactive profile, or invalid role and confirm the app shows the access denied page.
7. Use the sidebar/header **Logout** button and confirm a restricted URL redirects back to `/login` after logout.

## Security principles

- The frontend may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never put the Supabase `service_role` key in frontend code or a `NEXT_PUBLIC_` variable.
- Admin routes require a valid authenticated session.
- Admin authorization is validated against the `profiles` table, not hard-coded users.
- Claim documents are stored in a private bucket named `claim-documents`.
- Access to sensitive records is controlled with Supabase Row Level Security.
- Important system changes should be recorded in `audit_logs`.

## Deployment notes

- Deploy `apps/web-portal` to Vercel or another Next.js host.
- Configure production environment variables in the hosting provider.
- Run Supabase migrations against production before enabling production traffic.
- Keep privileged workflows on trusted server-side infrastructure when they require the service role key.

# Bas3line — Sponsor-Athlete Management Platform

A web app for Bas3line to manage their sponsored padel athletes. Athletes can post content, earn points, and redeem voucher codes. Sponsors manage athlete profiles, review posts, and configure the points system.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS v3
- **Routing**: React Router v6
- **Backend / DB / Auth**: Supabase (PostgreSQL + Row Level Security)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then fill in your Supabase project URL and anon key from the [Supabase dashboard](https://supabase.com/dashboard) → Project Settings → API.

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Apply the database schema

Make sure you have the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) installed and your project linked:

```bash
brew install supabase/tap/supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Start the development server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Migrations

Schema changes are managed as migration files in `supabase/migrations/`. To make a schema change:

1. Create a new migration file:
   ```bash
   supabase migration new <description>
   # e.g. supabase migration new add_sport_column
   ```
2. Write your SQL in the generated file
3. Apply it to the remote database:
   ```bash
   supabase db push
   ```

---

## Project Structure

```
src/
  lib/
    supabase.ts       # Supabase client
    types.ts          # TypeScript interfaces for all DB tables
  hooks/              # Shared React hooks (useAuth, etc.)
  components/
    auth/             # Login, route protection
    layout/           # Sponsor and athlete layout shells
    sponsor/          # Sponsor dashboard components
    athlete/          # Athlete dashboard components
    shared/           # Shared UI components
  App.tsx             # Routes

supabase/
  migrations/         # SQL migration files (applied via `supabase db push`)
  functions/
    invite-athlete/   # Edge Function for securely inviting athletes by email
```

---

## Edge Functions

The `invite-athlete` function handles athlete invites securely server-side (the Supabase service role key never touches the browser).

To deploy:
```bash
supabase functions deploy invite-athlete
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Roles

| Role | Access |
|---|---|
| `sponsor` | Full access: manage athletes, packages, post types, review posts, manage vouchers |
| `athlete` | Own profile, create posts, view points balance, redeem vouchers |

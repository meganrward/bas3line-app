# Sponsor/Athlete Management Platform

A web app for the sports brand BAS3LINE to manage their sponsored athletes. Athletes log activity, earn points, and redeem rewards. Sponsors manage rosters, review content, and configure their programme.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript, Tailwind CSS, React Router
- **Backend / DB / Auth**: Supabase (PostgreSQL, Row Level Security, Edge Functions)

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

Fill in your values from **Supabase Dashboard → Project Settings → API**:

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Apply the database schema

Requires the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
brew install supabase/tap/supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. (Optional) Load demo data

Run `supabase/seed.sql` in the **Supabase SQL Editor** to populate packages, post types, and sample voucher codes.

### 5. Create a sponsor account

In **Supabase Dashboard → Authentication → Users → Add user → Create new user**, then in the SQL Editor:

```sql
update public.profiles set role = 'sponsor' where id = '<your-user-id>';
```

### 6. Deploy the invite Edge Function

```bash
supabase functions deploy invite-athlete
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is under **Dashboard → Project Settings → API → service_role**.

### 7. Start the dev server

```bash
npm start
```

---

## Database Migrations

Schema changes live in `supabase/migrations/`. To add one:

```bash
supabase migration new <description>
supabase db push
```

---

## Running Tests

```bash
npm test
```

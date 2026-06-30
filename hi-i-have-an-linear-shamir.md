# Plan: Bas3line Brand Design System

## Context

The app is live but using placeholder sky-blue colours and no brand identity. The company has provided their official brand colours, typography (Obviously font family), and logo SVG. The goal is to apply the real brand and centralise all design decisions into a single CSS file so React components contain no Tailwind utility classes for visual styling — only layout/spacing utilities may remain inline where they are truly one-off.

---

## Brand tokens

**Colours**
| Token | RGB | Hex | Use |
|---|---|---|---|
| `brand-navy` | 33 / 30 / 105 | `#211e69` | Dark backgrounds, nav, headings |
| `brand-blue` | 23 / 120 / 241 | `#1778f1` | Primary actions, links, focus rings |
| `brand-yellow` | 239 / 255 / 0 | `#efff00` | Pop accent, highlights |
| `brand-orange` | 249 / 74 / 20 | `#f94a14` | Pop accent, warnings |
| `brand-white` | 255 / 255 / 255 | `#ffffff` | Backgrounds |
| `brand-black` | 0 / 0 / 0 | `#000000` | Text |

**Typography (Obviously font family)**
| Role | Variant | Letter-spacing |
|---|---|---|
| Headline | Obviously Black Italic | 0.03em (=30 in design tools) |
| Subheadline | Obviously Medium | 0.03em |
| Body | Obviously Narrow Medium | normal |

---

## Implementation steps

### 1. User places files
- Font files → `public/fonts/` (e.g. `Obviously-BlackItalic.woff2`, `Obviously-Medium.woff2`, `Obviously-NarrowMedium.woff2`)
- Logo SVG → `src/assets/logo.svg`

### 2. Update `tailwind.config.js`
Replace the placeholder `brand` shade palette with semantic tokens matching the brand guide. Add `fontFamily` extensions for the three Obviously variants and a custom `letterSpacing.brand` token (`0.03em`).

```js
colors: {
  brand: {
    navy:   '#211e69',
    blue:   '#1778f1',
    yellow: '#efff00',
    orange: '#f94a14',
    white:  '#ffffff',
    black:  '#000000',
  }
},
fontFamily: {
  display:        ['"Obviously"', 'sans-serif'],
  'display-narrow': ['"Obviously Narrow"', 'sans-serif'],
},
letterSpacing: {
  brand: '0.03em',
},
```

### 3. Rebuild `src/index.css`
Replace the three-line Tailwind stub with:
1. `@font-face` declarations for each Obviously variant
2. A `body` rule setting `font-family: 'Obviously Narrow', sans-serif` as the default
3. `@layer components` block defining all reusable semantic classes:

```css
/* Buttons */
.btn-primary   /* brand-blue bg, white text, hover → brand-navy */
.btn-secondary /* gray-100 bg, gray-700 text */
.btn-danger    /* red-600 bg, white text */

/* Cards */
.card          /* white bg, rounded-xl, shadow-sm */

/* Forms */
.input         /* full-width, rounded-lg, focus:brand-blue ring */
.input-label   /* sm font-medium gray-700 */

/* Typography */
.heading-page     /* 2xl bold, font-display, tracking-brand */
.heading-section  /* sm semibold gray-700 */

/* Badges & status */
.badge            /* base pill shape */
.badge-brand      /* blue tint */
.status-pending / .status-approved / .status-rejected

/* Utilities */
.spinner       /* brand-blue spinning ring */
.error-message /* red-600 text on red-50 bg, rounded */
.success-message /* green */
```

### 4. Create `src/components/shared/Logo.tsx`
A named-export `Logo` component that renders the SVG from `src/assets/logo.svg` via an `<img>` tag (or inline SVG). Accepts optional `className` and `height` props.

### 5. Update all components
Replace inline Tailwind utility strings for visual styling with the semantic class names from step 3. Layout utilities (`max-w-2xl`, `grid grid-cols-2 gap-4`, `mb-6`, `flex items-center`) stay inline since they are one-off layout, not reusable design.

Components to update (all follow the same find-and-replace pattern):
- `src/components/auth/LoginPage.tsx`
- `src/components/sponsor/AthletesList.tsx`, `AthleteDetail.tsx`, `AddAthleteForm.tsx`, `PackageManager.tsx`, `PostTypeManager.tsx`, `PostsReviewFeed.tsx`, `VoucherManager.tsx`
- `src/components/athlete/MyProfile.tsx`, `CreatePost.tsx`, `MyPosts.tsx`, `PointsDashboard.tsx`, `VoucherRedemption.tsx`
- `src/components/layout/SponsorLayout.tsx`, `AthleteLayout.tsx`

### 6. Add logo to layouts
In `SponsorLayout` and `AthleteLayout`, replace any text logo/brand name with the `<Logo>` component.

---

## Critical files
- `tailwind.config.js`
- `src/index.css`
- `src/components/shared/Logo.tsx` *(new)*
- `src/assets/logo.svg` *(user-placed)*
- `public/fonts/` *(user-placed)*
- All layout and page components listed in step 5

---

## Verification
1. Run `npm start` — no compile errors
2. Check that buttons, cards, inputs, badges all render correctly with the new brand colours
3. Check that the Obviously font loads (inspect → computed font in DevTools)
4. Check logo appears in both sponsor and athlete nav
5. Confirm no raw Tailwind colour utility classes (e.g. `bg-brand-500`, `text-brand-600`) remain in `.tsx` files — a grep for `brand-5\|brand-6\|brand-7` should return nothing

# Plan: Bas3line Sponsor-Athlete Management App (MVP)

## Context

A padel sportswear/equipment sponsor wants a web app to manage their sponsored athletes. Athletes need a place to post content (links to Instagram, tournament results, YouTube, etc.), earn points for posts, and redeem those points for voucher codes. The sponsor needs a dashboard to manage athlete profiles, review posts, configure point values per post type, and issue voucher codes.

This is an MVP targeting one sponsor. The architecture should support multi-sponsor expansion later without a rewrite.

---

## Recommended Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (existing CRA) | Already set up |
| Styling | Tailwind CSS | Fast to build with, clean look |
| Routing | React Router v6 | Standard, simple |
| Backend/DB/Auth | **Supabase** | Free tier, Postgres (relational = right fit for this data), built-in auth with email/password, Row Level Security for role enforcement, no server to manage |

**Why Supabase over Firebase**: The data is highly relational (athletes → packages → sponsors → posts → points → vouchers). PostgreSQL handles this naturally. Firebase's Firestore (NoSQL) would require denormalization hacks. Supabase also has a UI dashboard the sponsor can use directly if needed.

**Why Supabase over Azure/AWS**: Zero config for auth and hosting at this scale. Free tier handles the MVP easily. Migrate to Azure/AWS later if enterprise requirements emerge.

---

## MVP Scope (what's in, what's cut)

**In:**
- Email/password auth with two roles: `sponsor` and `athlete`
- Sponsor dashboard: add athletes, view/edit full athlete profiles, manage packages, configure post types + point values, review/approve posts, add voucher codes
- Athlete dashboard: view own profile, create posts (links only, no embeds), track points balance, request voucher when threshold reached
- Points awarded automatically when sponsor approves a post (based on that post type's configured points value)
- Sponsor manually enters voucher codes; athlete sees available vouchers and requests redemption

**Cut for v1:**
- Multiple sponsors per athlete (one sponsor, designed to expand)
- Instagram/YouTube embedded previews (links only)
- Athlete can see other athletes' profiles
- Auto-generated voucher codes

---

## Database Schema (Supabase / PostgreSQL)

```sql
-- Extends Supabase auth.users
profiles (
  id          uuid references auth.users primary key,
  role        text check (role in ('sponsor', 'athlete')),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
)

sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text,           -- e.g. "Bas3line"
  logo_url    text,
  website_url text,
  created_at  timestamptz default now()
)

sponsorship_packages (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid references sponsors,
  name        text,           -- e.g. "Elite", "Pro", "Development"
  description text,
  created_at  timestamptz default now()
)

athlete_profiles (
  id                uuid references profiles primary key,
  sponsor_id        uuid references sponsors,
  package_id        uuid references sponsorship_packages,
  ranking           text,     -- Padel ranking/category
  clubs             text,     -- clubs they coach at (comma-separated or text for MVP)
  training_location text,
  racket_brand      text,
  racket_model      text,
  bio               text,
  instagram_handle  text,
  points_balance    int default 0,
  created_at        timestamptz default now()
)

post_types (
  id           uuid primary key default gen_random_uuid(),
  sponsor_id   uuid references sponsors,
  name         text,          -- e.g. "Instagram Post", "Tournament Result", "Training Video"
  points_value int,
  description  text,
  is_active    boolean default true,
  created_at   timestamptz default now()
)

posts (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid references profiles,
  post_type_id   uuid references post_types,
  title          text,
  content        text,         -- description/caption
  link_url       text,         -- URL to content
  status         text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  points_awarded int,
  reviewed_by    uuid references profiles,
  reviewed_at    timestamptz,
  created_at     timestamptz default now()
)

points_transactions (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid references profiles,
  post_id     uuid references posts,
  points      int,
  description text,
  created_at  timestamptz default now()
)

voucher_codes (
  id              uuid primary key default gen_random_uuid(),
  sponsor_id      uuid references sponsors,
  code            text unique,
  points_required int,
  description     text,        -- e.g. "20% off your next order"
  is_used         boolean default false,
  used_by         uuid references profiles,
  used_at         timestamptz,
  created_at      timestamptz default now()
)
```

Row Level Security (RLS) policies will be set so:
- Athletes can only read/write their own rows
- Sponsors can read/write all rows for their `sponsor_id`

---

## Frontend Structure

All source files use **TypeScript** (`.tsx` / `.ts`). CRA will be migrated to TypeScript by renaming `src/index.js` → `src/index.tsx`, `src/App.js` → `src/App.tsx`, and adding a `tsconfig.json`.

```
src/
  lib/
    supabase.ts           -- Supabase client (env vars for URL + anon key)
    types.ts              -- shared TypeScript types/interfaces matching DB schema
  hooks/
    useAuth.ts            -- current user + role
    useAthleteProfile.ts  -- fetch own athlete profile
  components/
    auth/
      LoginPage.tsx
      ProtectedRoute.tsx  -- redirects by role
    layout/
      SponsorLayout.tsx   -- nav + sidebar for sponsor
      AthleteLayout.tsx   -- nav for athlete
    sponsor/
      AthletesList.tsx
      AthleteDetail.tsx
      AddEditAthleteForm.tsx
      PackageManager.tsx
      PostTypeManager.tsx
      PostsReviewFeed.tsx -- pending posts queue
      VoucherManager.tsx
    athlete/
      MyProfile.tsx
      CreatePost.tsx
      MyPosts.tsx
      PointsDashboard.tsx -- balance + transaction history
      VoucherRedemption.tsx
    shared/
      PostCard.tsx
      PointsBadge.tsx
  App.tsx                 -- routes
  index.tsx
```

---

## Key User Flows

### 1. Sponsor invites athlete
Sponsor fills "Add Athlete" form → frontend calls Supabase Edge Function `invite-athlete` (authenticated as sponsor) → Edge Function uses service role key to call `supabase.auth.admin.inviteUserByEmail()` and pre-creates the `athlete_profiles` row → athlete receives invite email, sets password → on first login, `profiles` row is created with `role: 'athlete'`

### 2. Athlete creates a post
Athlete fills form: selects post type, adds title + description + URL → post saved with `status: 'pending'`

### 3. Sponsor reviews post
Sponsor sees pending posts feed → approves or rejects → on approve: `posts.status` → `'approved'`, `posts.points_awarded` set to the post type's `points_value`, `points_transactions` row inserted, `athlete_profiles.points_balance` incremented

### 4. Athlete redeems a voucher
Athlete sees available vouchers (where `voucher_codes.points_required <= athlete_profiles.points_balance` and `is_used = false`) → clicks "Redeem" → `voucher_codes.is_used` = true, `used_by` set, `points_balance` decremented, voucher code revealed to athlete

---

## Implementation Steps

> **Commit workflow**: Pause after each phase for user to commit to GitHub before starting the next.

### Phase 1 — Setup *(commit 1)*
1. Migrate CRA to TypeScript: rename `src/index.js` → `src/index.tsx`, `src/App.js` → `src/App.tsx`, add `tsconfig.json`
2. Install dependencies: `react-router-dom`, `@supabase/supabase-js`, `tailwindcss`, `@tailwindcss/forms`, TypeScript types (`@types/react`, `@types/react-dom`, `@types/react-router-dom`)
3. Configure Tailwind in the CRA project (`tailwind.config.js`, update `src/index.css`)
4. Create Supabase project (manual step — user creates project at supabase.com), run schema SQL, enable RLS, write policies; deploy the `invite-athlete` Edge Function with `SUPABASE_SERVICE_ROLE_KEY` set as a Supabase secret (never committed to git)
5. Add `.env` with `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`; add `.env` to `.gitignore`
6. Create `src/lib/supabase.ts` client and `src/lib/types.ts` with all DB interfaces
7. Clean out CRA boilerplate from `App.tsx`
8. **Pause for commit 1**

### Phase 2 — Auth *(commit 2)*
9. `LoginPage.tsx` with email/password form calling `supabase.auth.signInWithPassword()`
10. `useAuth.ts` hook — exposes `{ user, profile, loading }` where `profile` contains the role
11. `ProtectedRoute.tsx` — checks role, redirects to `/login` if unauthenticated or wrong role
12. Wire up routes in `App.tsx`: `/login`, `/sponsor/*`, `/athlete/*`
13. Basic `SponsorLayout.tsx` and `AthleteLayout.tsx` shells with nav
14. **Pause for commit 2**

### Phase 3 — Athlete Dashboard *(commit 3)*
15. `MyProfile.tsx` — read-only view of own `athlete_profiles` row (ranking, clubs, package, racket, etc.)
16. `CreatePost.tsx` — form: select active post type, title, description, URL → saves with `status: 'pending'`
17. `MyPosts.tsx` — list own posts with status badges (pending / approved / rejected)
18. `PointsDashboard.tsx` — current balance + `points_transactions` history table
19. `VoucherRedemption.tsx` — list available vouchers (points_required ≤ balance, unused); redeem button
20. **Pause for commit 3**

### Phase 4 — Sponsor Dashboard *(commit 4)*
21. `AthletesList.tsx` — table of all athletes with package name + points balance
22. `AthleteDetail.tsx` — full profile view
23. `AddEditAthleteForm.tsx` — invite athlete by email; invite is sent via a **Supabase Edge Function** (`supabase/functions/invite-athlete/index.ts`) that uses the service role key server-side to call `supabase.auth.admin.inviteUserByEmail()`, then pre-creates the `athlete_profiles` row. The Edge Function is the only place the service role key lives — never in the frontend.
24. `PackageManager.tsx` — CRUD for sponsorship packages
25. `PostTypeManager.tsx` — CRUD for post types + point values per type
26. `PostsReviewFeed.tsx` — pending posts list; approve button triggers: set `status='approved'`, set `points_awarded`, insert `points_transactions` row, increment `athlete_profiles.points_balance`; reject sets `status='rejected'`
27. `VoucherManager.tsx` — add voucher codes with description + points threshold; table of all codes showing used/unused + who redeemed
28. **Pause for commit 4**

### Phase 5 — Polish *(commit 5)*
29. Responsive layout pass with Tailwind (mobile-friendly nav, card grids)
30. Loading spinners and error toasts throughout
31. Empty states (e.g. "No pending posts", "No vouchers available yet")
32. Seed SQL script for demo data (one sponsor, 3 athletes, sample post types, sample posts)
33. `README.md` with setup instructions (env vars, Supabase setup, running locally)
34. **Pause for commit 5**

---

## Expandability Notes (for future)
- **Athlete self-registration**: The `profiles` table and auth flow are already structured so that a self-registered athlete (no invite) works — just add a public `/register` route and skip the sponsor invite flow. The `athlete_profiles.sponsor_id` can then be set later when a sponsor relationship is established.
- **Multi-sponsor**: Replace `athlete_profiles.sponsor_id` with a `sponsorships` join table (`athlete_id`, `sponsor_id`, `package_id`) when athletes can have multiple sponsors.
- **Athlete discovery**: Once self-registration exists, add a searchable athlete directory visible to sponsors for discovering talent.
- **Embed previews**: Replace `link_url` display with oEmbed API calls per domain (Instagram, YouTube, etc.).
- **Other sports**: Add a `sport_data jsonb` column to `athlete_profiles` for sport-specific fields without schema changes.
- **Auto voucher codes**: Generate codes on redemption request via Edge Function instead of pre-entering them.

---

## Verification Plan
1. **Auth**: log in as sponsor → lands on sponsor dashboard; log in as athlete → lands on athlete dashboard; visiting wrong route redirects
2. **Athlete profile**: sponsor adds athlete, fills profile → athlete logs in and sees correct data
3. **Post flow**: athlete submits post → sponsor sees it in pending feed → approves → athlete's points balance increases → transaction appears in history
4. **Voucher flow**: athlete accumulates enough points → voucher appears in redemption page → redeem → code revealed, balance decreases, voucher marked used
5. **RLS**: confirm athlete cannot access other athletes' data via Supabase client

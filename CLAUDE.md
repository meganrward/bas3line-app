# Bas3line — Project Context for AI

## What this is

A sponsor–athlete management portal for a padel sportswear company called **Bas3line**. Sponsors manage their sponsored athletes; athletes post content (Instagram, tournament results, etc.), earn points per approved post, and redeem points for voucher codes.

Currently a single-sponsor MVP. One sponsor organisation, multiple athletes, one portal.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, CRA (react-scripts 5.0.1) |
| Styling | Tailwind CSS v3 + @tailwindcss/forms |
| Routing | React Router v6 |
| Backend / DB / Auth | Supabase (PostgreSQL, RLS, Edge Functions, Auth) |
| Deployment | GitHub Actions → GitHub Pages |

---

## Coding rules (must follow)

- **Named exports only** — never use `export default`
- **No `useCallback`** — use plain async functions inside `useEffect`
- **No abbreviations** in variable names (`sponsorId` not `sId`)
- **No inline Tailwind for visual styling** — all visual classes live in `src/index.css` as semantic `@layer components` classes (`.btn-primary`, `.card`, `.input`, etc.). Only layout/spacing utilities may appear inline in components (`flex`, `gap-4`, `max-w-2xl`, etc.)
- **SERVICE_ROLE_KEY must never be in the frontend or committed to git** — lives only as a Supabase secret set via CLI, used only in Edge Functions
- `npm ci --legacy-peer-deps` — TypeScript 6 conflicts with react-scripts peer dep, always use this flag in CI

---

## Brand

- **Navy** `#211e69` — dark backgrounds, primary actions hover state
- **Blue** `#1778f1` — primary actions, links, focus rings
- **Yellow** `#efff00` — accent
- **Orange** `#f94a14` — accent
- Font: **Obviously** (Adobe Fonts / OH no Type) — skipped for now, using system font. When adding: `obviously` and `obviously-narrow` are the Adobe CSS family names. Add kit `<link>` to `public/index.html`.

Logo SVGs are in `src/assets/`: `logo.svg` (mark only), `name.svg` (wordmark), `name_and_slogan.svg` (wordmark + slogan). The `Logo` component at `src/components/shared/Logo.tsx` renders them via variant prop: `'mark' | 'name' | 'full'`.

---

## Project structure

```
src/
  assets/           logo.svg, name.svg, name_and_slogan.svg
  components/
    auth/           LoginPage.tsx, ProtectedRoute.tsx
    layout/         SponsorLayout.tsx, AthleteLayout.tsx
    shared/         Logo.tsx
    sponsor/        AthletesList, AthleteDetail, AddAthleteForm,
                    PackageManager, PostTypeManager, PostsReviewFeed,
                    VoucherManager
    athlete/        MyProfile, CreatePost, MyPosts,
                    PointsDashboard, VoucherRedemption
  hooks/            useAuth.ts
  lib/
    supabase.ts     Supabase client (reads REACT_APP_SUPABASE_URL / ANON_KEY)
    types.ts        Shared TS interfaces matching DB schema
    queryTypes.ts   Return-type interfaces for query functions
    queries.ts      All Supabase query functions (centralised)
supabase/
  functions/
    invite-athlete/ Edge Function — invites athlete by email using service role key,
                    pre-creates athlete_profiles row
  migrations/       Applied in order; push with `supabase db push`
public/
  index.html        Title: "Bas3line". Add Adobe Fonts kit link here when ready.
src/index.css       ALL visual design — brand tokens via Tailwind @apply,
                    semantic component classes
tailwind.config.js  Brand colour tokens under `brand.*`
.github/workflows/
  deploy.yml        Push to main → builds → deploys to gh-pages branch
```

---

## Database schema (key tables)

```
profiles          id (= auth.users.id), role ('sponsor'|'athlete'), full_name
sponsors          id, name, logo_url, website_url
sponsor_staff     id, sponsor_id, user_id, role ('admin'|'staff')  ← allows multiple users per sponsor
sponsorship_packages  id, sponsor_id, name, description
athlete_profiles  id (= profiles.id), sponsor_id, package_id, ranking,
                  clubs, training_location, racket_model, instagram_handle,
                  bio, points_balance
post_types        id, sponsor_id, name, points_value, description, is_active
posts             id, athlete_id, post_type_id, title, content, link_url,
                  status ('pending'|'approved'|'rejected'), points_awarded,
                  reviewed_by, reviewed_at
                  NOTE: two FKs to profiles (athlete_id + reviewed_by).
                  Always specify FK explicitly: profiles!posts_athlete_id_fkey(full_name)
points_transactions  id, athlete_id, post_id, points, description
voucher_codes     id, sponsor_id, code, points_required, description,
                  is_used, used_by, used_at
```

### RLS / auth helpers

- `current_user_role()` — returns `profiles.role` for the current user
- `is_sponsor_or_staff()` — returns true if role = 'sponsor' OR user exists in sponsor_staff. **Use this, not `current_user_role() = 'sponsor'`**, so staff users pass sponsor checks.
- Both are `SECURITY DEFINER` functions

### Key DB notes

- `approve_post(post_id uuid)` — Postgres function that sets status='approved', awards points, inserts points_transaction, updates points_balance
- `redeem_voucher(voucher_id uuid)` — Postgres function for voucher redemption
- `racket_brand` column exists in athlete_profiles DB but is NOT used in the UI (kept nullable, removed from TypeScript types)

---

## useAuth hook

`src/hooks/useAuth.ts` exposes: `{ user, profile, sponsorId, loading }`

- `sponsorId` — resolves for both sponsor users (from `sponsors` table) and sponsor staff users (from `sponsor_staff` table)
- Always check `sponsorId` in sponsor components, not `user.id`

---

## Semantic CSS classes (src/index.css)

All visual styling lives here. Key classes:

| Class | Purpose |
|---|---|
| `.btn-primary` | Brand-blue bg, white text, hover navy |
| `.btn-secondary` | Gray bg |
| `.btn-success` | Green bg (approve) |
| `.btn-danger-text` | Red text link (delete) |
| `.btn-muted-text` | Gray text link (deactivate) |
| `.card` | White bg, rounded-xl, shadow-sm |
| `.input` | Full-width form field |
| `.input-label` | Form field label |
| `.heading-page` | 2xl bold gray-900 |
| `.heading-section` | sm semibold gray-700 |
| `.table-col-header` | Table `<th>` |
| `.badge` | Base pill |
| `.badge-brand` | Blue tint pill (points) |
| `.status-pending/approved/rejected` | Coloured status pills |
| `.alert-error` | Red error block |
| `.alert-success` | Green success block |
| `.spinner` | Brand-blue loading ring |
| `.nav-link` / `.nav-link-active` | Nav items |
| `.points-card` | Navy bg hero card (points balance) |

---

## CI/CD

- Push to `main` → GitHub Actions builds and deploys to `gh-pages` branch
- Secrets required in GitHub repo settings: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- `npm ci --legacy-peer-deps` is required (TypeScript 6 vs react-scripts peer dep conflict)
- Production URL is GitHub Pages URL — must be added to Supabase Auth → Site URL and Redirect URLs

## Local development

```bash
npm start                    # dev server on localhost:3000
supabase start               # local Supabase (optional)
supabase db push             # apply migrations to remote
supabase functions deploy invite-athlete  # deploy edge function
```

Edge function secret (never commit):
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
```

---

## Known issues / pending work

- **Font**: Obviously (brand font) skipped for now — using system font. To add later: buy web license from OH no Type, self-host in `public/fonts/`, add `@font-face` to `src/index.css`, or use Adobe Fonts kit via `<link>` in `public/index.html` (requires Creative Cloud subscription). Adobe CSS names are `obviously` and `obviously-narrow`.
- **Email rate limits**: Supabase free tier has strict invite email limits. Fix: set up custom SMTP via Resend in Supabase dashboard → Authentication → SMTP settings.
- **Supabase redirect URLs**: Production GitHub Pages URL needs to be added in Supabase Auth settings (Site URL + Redirect URLs) for login to work on prod.
- **Deno VS Code errors** in `supabase/functions/invite-athlete/index.ts` are cosmetic — install the `denoland.vscode-deno` VS Code extension to resolve.

# Bas3line — Project Context for AI

## What this is

An ambassador management portal for a padel sportswear company called **Bas3line**. Sponsor staff manage their ambassadors (profiles, rankings, Instagram engagement, discount-code sales and commission). Ambassadors are meant to get their own app with five areas, per the sponsor's brief:

1. **Your Profile** — role in the team, location, LTA ranking
2. **Your Progress** — online (Instagram) engagement over time
3. **Your Sales** — every sale and commission
4. **Marketplace** — full product range at wholesale prices, ambassadors only
5. **Cash or Kit** — swap commission for gear, or have it paid out. *Now split: cash is "Redeem commission" on the Sales tab; kit is a commission discount at Marketplace checkout. There is no Cash or Kit tab.*

Single-sponsor. One sponsor organisation, multiple ambassadors.

### Current state vs roadmap

- **Built (sponsor):** ambassador list/add/edit (incl. team role, city/region, home club), FIP + LTA rankings, Instagram analytics tab, sales and commission tab, WooCommerce sales webhook, **Payouts** review queue (`/sponsor/payouts`: approve / reject / mark paid).
- **Built (ambassador):** role-based login routing, `/ambassador/*` shell, **Your Profile** (details, edit bio / city / home club, rankings with refresh, Instagram connect link), **Your Sales** (totals, commission and history; refunded sales are shown but not counted), **Redeem commission** (bottom of the Sales tab: balance, cash payout request form, request history).
- **Not built:** Your Progress, a sponsor page to manage kit items, Marketplace (kit will be bought there, with commission offered as a discount at checkout; `kit_items` and the kit side of `request_payout` are already in the database for it). Those routes are "coming soon" placeholders. Instagram *connection status* needs Phase 3's `get-my-engagement`.
- **Roadmap phases:** 0 housekeeping/security (done), 1 ambassador shell (done), 2 profile (done, except the nightly ranking refresh), 3 progress, 4 sales, 5 cash or kit, 6 marketplace.
- The old points/posts/vouchers design was dropped in `20260622000000_pivot_to_ambassadors.sql`. Don't resurrect it.

### Decisions already made

- Team role is a sponsor-assigned text label.
- Cash or kit is a request-based ledger. The sponsor approves and pays manually outside the app (no Stripe). Kit credit converts at face value; commission accrues on sale (no return-window hold).
- The production store is **WooCommerce**. The marketplace browses in-app and checks out on the store.
- LTA has no public API (confirmed by email), so scraping `competitions.lta.org.uk` stays.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, CRA (react-scripts 5.0.1) |
| Styling | Tailwind CSS v3 + @tailwindcss/forms |
| Routing | React Router v6 |
| Backend / DB / Auth | Supabase (PostgreSQL 17, RLS, Edge Functions, Auth) |
| Deployment | GitHub Actions → GitHub Pages |

---

## Coding rules (must follow)

- **Named exports only** — never use `export default`
- **No `useCallback`** — use plain async functions inside `useEffect`
- **No abbreviations** in variable names (`sponsorId` not `sId`)
- **No inline Tailwind for visual styling** — all visual classes live in `src/index.css` as semantic `@layer components` classes (`.btn-primary`, `.card`, `.input`, etc.). Only layout/spacing utilities may appear inline in components (`flex`, `gap-4`, `max-w-2xl`, etc.)
- **Thin components** — data shaping, validation, formatting and business logic go in pure functions in `src/lib/*.utils.ts`, with unit tests
- **Secrets** — `SERVICE_ROLE_KEY` (and the WooCommerce / padel API secrets) must never be in the frontend or committed. They live only as Supabase secrets set via CLI and are used only in Edge Functions. Note the name is `SERVICE_ROLE_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`: Supabase reserves the `SUPABASE_` prefix.
- **Edge functions must verify the caller.** An `Authorization` header is not enough: the public anon key passes the gateway. Use `authorizeAmbassadorAccess` from `supabase/functions/_shared/` (verifies the user, then sponsor/staff or the ambassador themselves, or the scheduled job via the `X-Cron-Secret` header matching `CRON_SECRET`), and read external IDs from the database rather than trusting the request body. Only the scheduled job may send `force` to skip the FIP cache. `get-fip-ranking` and `get-lta-ranking` have `verify_jwt = false` in `supabase/config.toml` (like `record-discount-sale`): the gateway's JWT check is off, so this in-function check is the only gate. Keep it.
- `npm ci --legacy-peer-deps` — TypeScript 6 conflicts with react-scripts peer dep, always use this flag in CI
- Git: Megan makes all commits. Don't commit or push.

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
  App.tsx           Routes: /login, /sponsor/* (role-guarded), * → /login
  assets/           logo.svg, name.svg, name_and_slogan.svg
  components/
    auth/           LoginPage, ProtectedRoute (+ tests)
    layout/         SponsorLayout
    shared/         Logo, ClubPicker (club dropdown with inline "add a club"),
                    RankingsTable (read-only, or with Remove for sponsors)
    ambassador/     MyProfile (+ MyProfileEditForm, MyRankings), ComingSoon placeholder
    sponsor/        AmbassadorsList, AddAmbassadorForm, PayoutQueue (+ PayoutQueueRow),
                    AmbassadorDetail (tabs: Instagram, Rankings, Sales; edit panel),
                    SalesCommissions
  hooks/            useAuth.ts, usePadelClubs.ts, useRankings.ts (load + refresh FIP/LTA)
  lib/
    supabase.ts         Main Supabase client (REACT_APP_SUPABASE_URL / ANON_KEY)
    supabaseMonitor.ts  Client for the separate monitor project (Instagram data)
    types.ts            Shared TS interfaces matching DB schema
    queryTypes.ts       Return-type interfaces for query functions
    queries.ts          All Supabase query functions (centralised)
    clubs.utils.ts      Pure club helpers (labels, sorting, duplicate check, profile subtitle)
    routes.utils.ts     homePathForRole
    profile.utils.ts    Profile detail rows, last-updated formatting, ambassador edit validation
    links.ts            External URLs (Instagram connect page)
supabase/
  functions/
    _shared/                  authorize-ambassador-access.ts (auth helper)
    invite-athlete/           Invites an ambassador by email; creates their ambassador_profiles row
    get-fip-ranking/          Fetches FIP ranking from padelapi.org (PADEL_API_TOKEN), caches 24h
    get-lta-ranking/          Scrapes competitions.lta.org.uk, caches by LTA "last updated"
    record-discount-sale/     WooCommerce webhook (verify_jwt=false; X-Webhook-Secret header)
  migrations/       Applied in order
  seed.sql          LOCAL-only seed data
public/index.html   Title: "Bas3line"
src/index.css       ALL visual design — brand tokens via Tailwind @apply, semantic component classes
tailwind.config.js  Brand colour tokens under `brand.*`
.github/workflows/deploy.yml   Push to main → builds → deploys to gh-pages branch
```

### Related repos (`~/projects/bas3line/`, built by a coworker)

- `bas3line-ambassador-connect` — static Netlify page where an ambassador connects Instagram (native Instagram Login OAuth). Its edge function lives in the **monitor** Supabase project.
- `bas3line-ambassador-monitor` — Node worker, hourly. Pulls Instagram Graph API data and writes `ambassadors` (including access tokens), `posts`, `daily_metrics`, `alerts`, `collection_state` in the **monitor** Supabase project. Refreshes tokens before their 60-day expiry.
- The monitor project holds Instagram access tokens. Never expose that table to ambassadors. The planned `get-my-engagement` edge function reads it with a service key and returns only the caller's metrics.

---

## Database schema (key tables, main project)

```
profiles              id (= auth.users.id), role ('sponsor'|'ambassador'), full_name
sponsors              id, name, logo_url, website_url
sponsor_staff         id, sponsor_id, user_id, staff_role ('manager'|'athlete_manager'|'ambassador_agent')
ambassador_profiles   id (= profiles.id), sponsor_id, instagram_handle, instagram_user_id, bio, gender,
                      fip_player_slug, lta_player_id (competitions UUID), lta_membership_number,
                      discount_code (unique, stored lowercase), commission_rate (default 10.00),
                      team_role (sponsor-assigned label), training_location (city / region),
                      home_club_id → padel_clubs
padel_clubs           id, name, town, county, region, created_by. Our own list (no external API).
                      Signed-in users read and add; only sponsors edit/delete. Unique on name+town.
ambassador_rankings   ambassador_id, source ('fip'|'lta'), category, rank, points_value, fetched_at
                      unique per (ambassador, source, category); sponsor-only write via service role
discount_code_sales   ambassador_id, discount_code, order_id (unique), order_total,
                      commission_amount, sale_date, status ('completed'|'refunded'), refunded_at
                      sponsor/staff read all, ambassador reads own, only service_role inserts
commission_ledger     ambassador_id, entry_type ('sale_commission'|'refund_reversal'|'cash_payout'|'kit_credit'|'payout_reversal'),
                      amount (signed), sale_id, payout_request_id. Append-only (trigger blocks edit/delete).
                      Written only by triggers on discount_code_sales and by approve_payout; read-only to users.
                      Balance = sum of entries; see the commission_balance view.
payout_requests       ambassador_id, request_type ('cash'|'kit'), amount, note, status
                      ('pending'|'approved'|'paid'|'rejected'), sponsor_note, reviewed_by/at, paid_at.
                      No direct writes: use request_payout / approve_payout / reject_payout /
                      mark_payout_paid / undo_payout_approval (security definer; undo adds a positive
                      'payout_reversal' ledger entry and returns the request to pending; paid is final). Pending requests are held against the balance
                      (my_available_balance()). Kit is a discount: kit_credit_value = amount x
                      sponsors.kit_credit_multiplier (1.00 now; raise it, e.g. 1.25, to reward kit over
                      cash), snapshotted per request; the ledger debits the commission spent, not the
                      boosted value. A refund after payout can make a balance negative; it
                      offsets future commission, nothing is clawed back.
kit_items             sponsor_id, name, price, active, sort_order. Sponsor staff manage; ambassadors read
                      their sponsor's active items. request_payout takes an optional kit item: the request
                      copies its name/price (kit_item_name/price) and the discount can't exceed the price.
```

- Instagram `posts` live in the separate monitor project, not this database. (The old orphaned `public.posts` table is dropped by `20260705000000_drop_orphaned_posts_table.sql`.)
- Staff roles live in `sponsor_staff.staff_role`; the old `'admin'|'staff'` values are gone.

### Ambassador self-edit guard

Ambassadors can update their own `ambassador_profiles` row, but the `guard_ambassador_profile_update` trigger only lets them change the columns in its `editable_columns` allow-list (currently `bio`, `training_location`). Everything else (`commission_rate`, `discount_code`, IDs, `sponsor_id`) is sponsor-only. Sponsors, staff and service-role code are unrestricted. To let ambassadors edit another column, redefine that function in a new migration and add a pgTAP test. Tests live in `supabase/tests/database/` and run with `supabase test db`.

### Scheduled ranking refresh

pg_cron (UTC) calls `get-fip-ranking` / `get-lta-ranking` for every ambassador via `public.refresh_rankings(source)` (`20260710000000_schedule_ranking_refresh.sql`). FIP is polled Monday 08/12/16 plus Tuesday 08; LTA Friday 10:30/12/14/17 plus Saturday 08. FIP is forced past its 24h cache. It needs two Vault secrets on the database, `project_url` and `cron_secret` (same value as the `CRON_SECRET` edge function secret); without them a run does nothing. Only the job owner can run it. To check runs: `select * from cron.job_run_details order by start_time desc limit 10;` and `select id, status_code, created from net._http_response order by created desc limit 10;`. To change the timing, edit the schedules in a new migration with `cron.schedule` (same job name replaces it).

### Who counts as a sponsor (security)

`profiles.role` decides sponsor access (`is_sponsor_or_staff()` accepts `role = 'sponsor'`), so it must never be user-editable. `20260716000000_lock_down_profile_roles.sql` revokes UPDATE on `profiles` except `full_name` / `avatar_url`, and `handle_new_user()` takes the role from `raw_app_meta_data` (service role / dashboard only), never `raw_user_meta_data` (which a person signing up controls). Everyone else is an ambassador. To make a sponsor: create the user, then in the SQL Editor `update public.profiles set role = 'sponsor' where id = '<user id>';` and add a `sponsor_staff` row. Keep "Allow new users to sign up" OFF in the prod Auth settings; ambassadors are invited. `supabase/tests/database/profile_role_lockdown.test.sql` covers this.

### Table access rules

- The signed-out `anon` role has **no** privileges on public tables (`20260709000000_revoke_anon_table_access.sql`), and new tables don't inherit any. Don't grant to `anon`. A pgTAP test enforces this.
- Every new table needs RLS enabled, explicit policies, and `grant ... to authenticated` (and `service_role` if an edge function writes to it). Add a pgTAP test for who can read and write.

### RLS / auth helpers

- `current_user_role()` — returns `profiles.role` for the current user
- `is_sponsor_or_staff()` — true if role = 'sponsor' OR user exists in sponsor_staff. **Use this, not `current_user_role() = 'sponsor'`**, so staff users pass sponsor checks.
- `current_ambassador_sponsor_id()` — the calling ambassador's sponsor
- All are `SECURITY DEFINER` functions

---

## useAuth hook

`src/hooks/useAuth.ts` exposes: `{ user, profile, sponsorId, staffRole, loading }`

- `sponsorId` and `staffRole` come from the user's `sponsor_staff` row. Both are null for ambassadors.
- Always check `sponsorId` in sponsor components, not `user.id`

---

## Semantic CSS classes (src/index.css)

All visual styling lives here. Key classes:

| Class | Purpose |
|---|---|
| `.btn-primary` | Brand-blue bg, white text, hover navy |
| `.btn-secondary` | Gray bg |
| `.btn-success` | Green bg |
| `.btn-danger-text` | Red text link (delete) |
| `.btn-muted-text` | Gray text link (deactivate) |
| `.card` | White bg, rounded-xl, shadow-sm |
| `.input` | Full-width form field |
| `.input-label` | Form field label |
| `.heading-page` | 2xl bold gray-900 |
| `.heading-section` | sm semibold gray-700 |
| `.table-col-header` | Table `<th>` |
| `.badge` | Base pill |
| `.badge-brand` | Blue tint pill |
| `.status-pending/approved/rejected` | Coloured status pills |
| `.alert-error` | Red error block |
| `.alert-success` | Green success block |
| `.spinner` | Brand-blue loading ring |
| `.nav-link` / `.nav-link-active` | Nav items |
| `.points-card` | Navy hero card (left over from the points design; reusable for a balance card) |

---

## Quality gates

Before work is done it must pass Prettier, ESLint and Sonar (`eslint-plugin-sonarjs`) with no warnings. Prefer many fast unit tests on the `lib/*.utils.ts` functions, React Testing Library flow tests for user-facing behaviour, and pgTAP tests for RLS. Lint, type-check and test steps are not yet wired into CI (roadmap Phase 0).

---

## CI/CD

- Push to `main` → GitHub Actions builds and deploys to `gh-pages` branch. It does not run tests or lint, and does not deploy migrations or edge functions.
- Secrets required in GitHub repo settings: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` (and the monitor pair, `REACT_APP_MONITOR_SUPABASE_URL` / `_ANON_KEY`)
- `npm ci --legacy-peer-deps` is required (TypeScript 6 vs react-scripts peer dep conflict)
- Production URL is the GitHub Pages URL — must be added to Supabase Auth → Site URL and Redirect URLs

## Local development

```bash
supabase start               # local Supabase (Docker) — applies migrations + seed.sql
npm start                    # dev server on localhost:3000 — uses LOCAL Supabase
supabase db reset            # wipe local DB, re-run migrations + seed
supabase test db             # run pgTAP RLS tests (needs the seeded local DB)
deno test supabase/functions/_shared   # unit tests for shared edge function code
supabase functions serve --env-file supabase/.env.local   # run edge functions locally (optional)
supabase db push             # apply migrations to REMOTE (prod) — only when ready to ship
supabase functions deploy <name>   # deploy an edge function to remote
supabase functions deploy get-fip-ranking get-lta-ranking record-discount-sale --no-verify-jwt   # these authenticate callers themselves; verify the "Enforce JWT Verification" toggle is OFF in the dashboard afterwards
```

**Local vs prod Supabase**

- `.env` points at the hosted (prod) project. `.env.development.local` (gitignored) overrides it for `npm start` only, pointing at local Supabase. Builds/CI never read it.
- Local ports are shifted to `553xx` in `supabase/config.toml` (API 55321, DB 55322, Studio 55323, Mailpit 55324) to avoid clashing with other local Supabase projects on the default `543xx` ports.
- `supabase/seed.sql` is local-only (known passwords). Logins: `sponsor@bas3line.test`, `ambassador1@bas3line.test`, `ambassador2@bas3line.test` — password `password123`.
- Invite emails sent locally land in Mailpit at http://127.0.0.1:55324, not real inboxes.
- Workflow: write migration → `supabase db reset` locally to verify → `supabase db push` to prod. The CLI must be linked to the **main** project, not the monitor project.
- `REACT_APP_MONITOR_SUPABASE_*` in `.env` is a separate project and is not overridden locally.

Edge function secrets (never commit):
```bash
supabase secrets set SERVICE_ROLE_KEY=<value> PADEL_API_TOKEN=<value> DISCOUNT_WEBHOOK_SECRET=<value> CRON_SECRET=<value>
```

---

## Known issues / pending work

- **Font**: Obviously (brand font) skipped for now — using system font. To add later: buy web license from OH no Type, self-host in `public/fonts/`, add `@font-face` to `src/index.css`, or use Adobe Fonts kit via `<link>` in `public/index.html` (requires Creative Cloud subscription). Adobe CSS names are `obviously` and `obviously-narrow`.
- **Email rate limits**: Supabase free tier has strict invite email limits. Fix: set up custom SMTP via Resend in Supabase dashboard → Authentication → SMTP settings.
- **Supabase redirect URLs**: Production GitHub Pages URL needs to be added in Supabase Auth settings (Site URL + Redirect URLs) for login to work on prod.
- **Routing on GitHub Pages**: `BrowserRouter` has no basename but the site is served from the `/bas3line-app` subpath. Check this works on prod (Phase 1).
- **LTA scraper** is fragile (HTML parsing). It has no official API to fall back on. Log failures and show "last updated" so stale data is visible.
- **WooCommerce snippet**: the WordPress code that calls `record-discount-sale` is not in this repo. Commit it (roadmap Phase 4).
- **Stale plan files** in the repo root (`right-now-i-want-fluttering-perlis.md` uses old `coupon_*` names; `hi-i-have-an-linear-shamir.md` names old athlete components).
- **Deno VS Code errors** in `supabase/functions/*/index.ts` are cosmetic — install the `denoland.vscode-deno` VS Code extension to resolve.

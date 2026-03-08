

# What's Left to Build

## Already Implemented
- Landing page with hero, features, pricing, how-it-works
- `/analyze` — product analysis input form
- `/dashboard` — AI-powered analysis with real charts (complaints, sentiment, trends, competitor intel)
- `analyze-product` edge function with Lovable AI + Firecrawl web scraping
- `/auth` — email login/signup
- `/history` — saved analyses list with delete
- Save analysis + CSV export
- `profiles` and `analyses` tables with RLS

## Remaining from PRD & Plan

### 1. Protected Routes
Currently `/analyze`, `/dashboard`, `/history` are accessible without auth. The `/analyze` and `/dashboard` pages should work for unauthenticated users (freemium), but the Navbar should show the logged-in user's state (name, sign out button) instead of always showing "Sign in".

### 2. Navbar Auth State
The landing `Navbar` always shows "Sign in" even when logged in. It should show the user's name/avatar and a sign-out button when authenticated, plus links to History and Dashboard.

### 3. Sign Out
There is no sign-out functionality anywhere in the app.

### 4. PDF Export
The plan mentioned PDF export alongside CSV. Currently only CSV is implemented.

### 5. Shareable Analysis Links
The plan mentioned generating shareable links for analyses. This requires making certain analyses publicly viewable (a `is_public` column + public RLS policy).

### 6. Page Transitions
The plan mentioned framer-motion page transitions between routes. Currently only individual elements animate.

### 7. Mobile Responsive Polish
The dashboard header and charts may not render well on small screens. The landing Navbar lacks a mobile hamburger menu.

---

## Implementation Plan

### Step 1: Auth-aware Navbar + Sign Out
- Update `Navbar.tsx` to use `useAuth()` hook — show user email + "Sign Out" button when logged in, hide "Sign in" link
- Add sign-out handler (`supabase.auth.signOut()`)
- Update Dashboard header similarly

### Step 2: Mobile Navbar
- Add hamburger menu toggle for mobile on the landing Navbar
- Ensure dashboard header wraps properly on small screens

### Step 3: PDF Export
- Add a "PDF" export button next to CSV on the Dashboard
- Use the browser's `window.print()` with a print-optimized stylesheet, or generate a simple PDF using a canvas-based approach

### Step 4: Shareable Analysis Links
- Add `is_public` boolean column to `analyses` table (default false)
- Add RLS policy: anyone can SELECT where `is_public = true`
- Add "Share" button on dashboard that toggles `is_public` and copies a public URL
- Update dashboard to load public analyses without auth

### Step 5: Page Transitions
- Wrap routes in `AnimatePresence` with `framer-motion` fade/slide transitions

### Step 6: Responsive Polish
- Audit dashboard grid layouts for mobile breakpoints
- Ensure charts have minimum heights and proper overflow handling


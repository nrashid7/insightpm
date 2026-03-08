

# Remaining Issues and Missing Features

## Critical Bug: RLS Policies Are Restrictive

All RLS policies on the `analyses` table are set as **restrictive** (`Permissive: No`). Restrictive policies require ALL to pass simultaneously. This means:
- "Users can view own analyses" AND "Anyone can view public analyses" must BOTH be true for any SELECT -- which breaks both private viewing (user's own non-public analyses won't show) and public sharing.
- Same issue on INSERT/DELETE/UPDATE policies.

**Fix:** Drop all existing policies and recreate them as PERMISSIVE (the default). This is the highest priority fix.

## Minor Issues

1. **`Analyze.tsx` and `History.tsx` use their own inline navbars** instead of the shared `Navbar` component -- inconsistent UX and duplicated code.
2. **"Watch Demo" button** on the hero section has no action (no link, no modal).
3. **Pricing "Get Started" buttons** don't navigate anywhere -- they should link to `/analyze` or `/auth`.
4. **Auth page** has its own inline nav instead of the shared Navbar.

## Implementation Plan

### Step 1: Fix RLS policies (database migration)
Drop all 5 existing policies on `analyses` and recreate them as PERMISSIVE:
- `Users can view own analyses` -- SELECT WHERE `auth.uid() = user_id`
- `Anyone can view public analyses` -- SELECT WHERE `is_public = true` (for anon + authenticated)
- `Users can insert own analyses` -- INSERT WITH CHECK `auth.uid() = user_id`
- `Users can update own analyses` -- UPDATE WHERE/WITH CHECK `auth.uid() = user_id`
- `Users can delete own analyses` -- DELETE WHERE `auth.uid() = user_id`

### Step 2: Unify navigation
- Use the shared `Navbar` component in `Analyze.tsx`, `History.tsx`, and `Auth.tsx` instead of inline navbars
- Add `pt-16` padding to page content to account for the fixed navbar

### Step 3: Wire up dead buttons
- "Watch Demo" on hero: smooth-scroll to `#how-it-works` section
- Pricing "Get Started" buttons: link to `/analyze`




# Enliven the Landing Page Background

The current page uses a flat `bg-background` (dark navy at `222 47% 6%`) with no texture or depth between sections. Only the Hero has animated gradient blobs -- every other section sits on the same plain color.

## Changes

### 1. Add a global animated noise/grain texture overlay
Add a subtle CSS noise texture to the `body` or the landing page wrapper using a tiny SVG filter or a CSS `background-image` pattern. This adds visual richness without heavy assets.

### 2. Add per-section ambient glow accents
Each major section gets a soft, unique radial gradient blob positioned behind the content:
- **BentoFeatures**: A cyan/primary glow at the top-left
- **Testimonials**: A warm amber/accent glow at the right
- **HowItWorks**: A blue/chart-2 glow centered
- **Pricing**: A purple/chart-5 glow at the bottom-right
- **CTABanner**: Already has its own gradient -- leave as-is

These are `absolute` positioned `div`s with large `blur` and low opacity, matching the Hero's existing pattern.

### 3. Add subtle dot grid pattern between sections
Apply a faint dot-grid or cross-hatch pattern to the page background (similar to the Hero's existing grid lines but using dots instead) for depth.

### 4. Add gradient dividers between sections
Insert soft gradient `<hr>` elements or `border-top` with a primary-to-transparent gradient between sections for visual separation.

## Files Modified
- **`src/index.css`** -- Add noise texture utility class and dot-grid pattern
- **`src/pages/Index.tsx`** -- Add the noise overlay div and section dividers
- **`src/components/landing/BentoFeatures.tsx`** -- Add ambient glow blob
- **`src/components/landing/Testimonials.tsx`** -- Add ambient glow blob
- **`src/components/landing/HowItWorksSection.tsx`** -- Add ambient glow blob
- **`src/components/landing/PricingSection.tsx`** -- Add ambient glow blob

## Technical Details
- All effects are pure CSS (no new dependencies)
- Glow blobs use the same approach as HeroSection: absolutely positioned divs with `blur-[120px]`, `rounded-full`, and low opacity
- Noise uses an inline SVG `url("data:image/svg+xml,...")` for a 1-2% opacity grain
- Dot grid reuses the Hero's `backgroundImage` linear-gradient technique but with `radial-gradient` dots


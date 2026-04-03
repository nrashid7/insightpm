

# Enhance Landing Page with 21st.dev-Inspired Components

## Approach

Since Lovable doesn't support custom MCP servers, I'll browse 21st.dev's component library directly, select the best-fit components for InsightPM's landing page, and adapt their code (they're all open-source shadcn/ui + Tailwind) to match the existing dark theme and design tokens.

## Current Landing Page Structure
- Navbar
- HeroSection (badge, headline, subtitle, 2 CTAs, stats row)
- FeaturesSection (6 cards in 3-col grid)
- HowItWorksSection (4 vertical timeline steps)
- PricingSection (3 pricing cards)
- Footer (minimal single-line)

## Enhancements Plan

### 1. Hero Section -- Add Animated Gradient Background + Particles
Inspired by 21st.dev hero patterns: replace static blur blobs with an animated gradient mesh or subtle particle effect using CSS animations. Add a floating mockup/screenshot preview of the dashboard below the CTA buttons to give visitors a visual anchor.

### 2. Features Section -- Bento Grid Layout
Replace the flat 6-card grid with a **Bento Grid** layout (inspired by `kokonutd/bento-grid`). Key features get larger 2-col spans, creating visual hierarchy. Add hover effects with subtle border glow and status tags.

### 3. Social Proof / Testimonials Section (NEW)
Add a new section between Features and How It Works with:
- Animated marquee of logo badges (companies/tools)
- 2-3 testimonial cards with avatar, quote, role

### 4. How It Works -- Interactive Tabs
Replace the vertical timeline with a **tabbed feature showcase** (inspired by `shadcnblocks-com-feature108`). Each step becomes a tab with an illustration/animation on the right side, making it more engaging.

### 5. CTA Banner Section (NEW)
Add a full-width gradient CTA section before the footer with a compelling headline, subtitle, and primary action button. Inspired by 21st.dev's call-to-action components.

### 6. Footer -- Expand to Multi-Column
Upgrade from single-line to a proper 4-column footer with: Product links, Resources, Company info, and a newsletter signup input.

### 7. Animated Number Counter for Stats
Replace static stats in the hero with animated count-up numbers that trigger when scrolled into view.

## New Files
- `src/components/landing/BentoFeatures.tsx` -- Bento grid features
- `src/components/landing/Testimonials.tsx` -- Social proof section
- `src/components/landing/CTABanner.tsx` -- Pre-footer CTA
- `src/components/ui/animated-counter.tsx` -- Number animation hook/component

## Modified Files
- `src/components/landing/HeroSection.tsx` -- Animated background + dashboard preview + animated counters
- `src/components/landing/HowItWorksSection.tsx` -- Tabbed layout
- `src/components/landing/Footer.tsx` -- Multi-column layout
- `src/components/landing/FeaturesSection.tsx` -- Remove (replaced by BentoFeatures)
- `src/pages/Index.tsx` -- Add new sections

## Dependencies
- No new npm packages needed -- all effects built with Framer Motion (already installed) + Tailwind CSS animations

## Implementation Order
1. Bento Grid features section
2. Hero enhancements (animated bg + counters + dashboard preview)
3. Testimonials / social proof section
4. How It Works tabs redesign
5. CTA Banner section
6. Footer expansion
7. Wire everything into Index.tsx


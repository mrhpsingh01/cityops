---
name: CityOps Civic Intelligence
colors:
  surface: '#ffffff'
  surface-dim: '#f4f7f4'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8faf8'
  surface-container: '#edf3ee'
  surface-container-high: '#e2eae3'
  surface-container-highest: '#d7e2d9'
  on-surface: '#152c28'
  on-surface-variant: '#556a64'
  canvas-base: '#f4f7f4'
  sidebar-base: '#0e2924'
  sidebar-elevated: '#173c35'
  sidebar-border: '#1c4941'
  primary: '#176f65'
  primary-container: '#e6f3ee'
  on-primary: '#ffffff'
  primary-hover: '#0e5950'
  accent-teal: '#258f82'
  accent-teal-glow: 'rgba(37, 143, 130, 0.25)'
  accent-copper: '#b9643b'
  accent-copper-soft: '#faeee8'
  accent-copper-hover: '#9e522d'
  signal-emerald: '#3da779'
  signal-emerald-pulse: 'rgba(61, 167, 121, 0.4)'
  hairline-border: '#dbe5df'
  hairline-border-subtle: '#eaf0ec'
  card-shadow: '0 4px 16px -2px rgba(14, 41, 36, 0.04), 0 2px 6px -1px rgba(14, 41, 36, 0.02)'
  card-shadow-hover: '0 12px 32px -4px rgba(14, 41, 36, 0.08), 0 4px 12px -2px rgba(14, 41, 36, 0.04)'
typography:
  display-hero:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: clamp(44px, 5.2vw, 72px)
    fontWeight: '780'
    lineHeight: '1.02'
    letterSpacing: -0.065em
  headline-xl:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: clamp(28px, 3.2vw, 42px)
    fontWeight: '760'
    lineHeight: '1.12'
    letterSpacing: -0.045em
  headline-lg:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.24'
    letterSpacing: -0.03em
  headline-md:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.025em
  body-md:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  label-eyebrow:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 11px
    fontWeight: '800'
    lineHeight: '1.35'
    letterSpacing: 0.13em
  telemetry-metric:
    fontFamily: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontFeatureSettings: '"tnum" 1, "cv05" 1'
    fontSize: clamp(24px, 2.6vw, 38px)
    fontWeight: '780'
    lineHeight: '1.0'
    letterSpacing: -0.055em
spacing:
  gutter: 1.25rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

# Design System: CityOps Civic Intelligence
**Project ID:** 16933968792950499705

## 1. Visual Theme & Atmosphere
CityOps represents an elevated civic intelligence platform engineered for transparency, research integrity, and operational clarity across NYC 311 service records.
The design bridges the gravitas of institutional public data journalism with the responsiveness and crisp telemetry of modern mission-control operations.

- **Atmosphere:** Deep forest green anchor sidebar (`#0e2924`), warm mineral off-white canvas (`#f4f7f4`), luminous pure white cards (`#ffffff`), and surgical copper accents (`#b9643b`).
- **Depth & Elevation:** Flat surfaces elevated by crisp 1px hairline borders (`#dbe5df`), soft ambient ambient shadows, and frosted-glass modal drawer backdrops.
- **Motion Philosophy:** Measured, spring-weighted, and informative. Every animation reinforces data relationships, guides eye movement, and gives tactile weight to user interactions without delaying cognition.

## 2. Color Palette & Roles
- **Canvas Base (`--canvas`)**: `#f4f7f4` — Soft, glare-free background keeping long analytical sessions comfortable.
- **Navigation Spine (`--sidebar`)**: `#0e2924` — Deep evergreen anchor establishing hierarchy and authority.
- **Primary Ink (`--ink`)**: `#152c28` — Deep forest obsidian for maximum contrast and typographic crispness.
- **Muted Ink (`--muted`)**: `#556a64` — Balanced secondary tone for subheadings, captions, and chart labels.
- **Primary Civic Teal (`--accent`)**: `#176f65` — Main brand vector, active controls, selected chart series, and positive movement.
- **Copper Alert (`--copper`)**: `#b9643b` — Reserved for volume increases, unresolved 7-day outcomes, and critical review points.
- **Live Signal Beacon (`--signal-emerald`)**: `#3da779` — Perpetual heartbeat indicator denoting real-time dataset sync.

## 3. Motion Architecture & Keyframe Specifications
- **Page & View Transitions:**
  - `@keyframes pageEnter`: 0.35s ease-out entrance with subtle 8px upward slide and fade-in.
  - Cascade delay on children (`.metric-card:nth-child(n)`, `.panel:nth-child(n)`) creating a swift waterfall reveal.
- **Progress & Chart Fill Reveals:**
  - `@keyframes barExpand`: 0.65s cubic-bezier(0.16, 1, 0.3, 1) growth along the X-axis for horizontal metric bars and stacked segments.
- **Tactile Card Micro-Interactions:**
  - Hover transition: `transform: translateY(-2.5px)` with smooth cubic-bezier easing (`0.2s cubic-bezier(0.16, 1, 0.3, 1)`).
  - Hover shadow lift: `box-shadow: 0 12px 28px -4px rgba(14, 41, 36, 0.07)`.
  - Subtle border highlight transition on hover (`border-color: #bcd4c7`).
- **Perpetual Heartbeat Indicator:**
  - `@keyframes pulseRing`: Dual-layer animated concentric ring breathing continuously around `.freshness-dot` to signal live data status.
- **Interactive Map Hover & Geo Selection:**
  - NYC borough SVG paths feature dynamic stroke width transition and soft illumination filter on hover/focus.
- **Flyout & Drawer Slides:**
  - Slide-in from right (`transform: translateX(0)`) with smooth damping spring physics.
  - Backdrop overlay with frosted glass blur (`backdrop-filter: blur(6px)`).

## 4. Typography Rules
- **Tabular Numerals:** All numeric figures enforce `font-variant-numeric: tabular-nums` to eliminate jitter on hover or updates.
- **Display Type:** Headings use tightly tracked uppercase eyebrows and authoritative editorial weights.

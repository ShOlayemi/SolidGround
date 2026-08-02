# SolidGround AI — Landing Page Design Specification

## Design Philosophy
"Stripe for relationships" — analytical credibility meets human warmth.

**North star:** Trustworthy, analytical, premium, warm, calm, credible.
**Anti-patterns:** Hearts, swiping motifs, bright gradients, casual/dating tone.

## Color Palette (Tailwind v4 @theme)

| Token | Value | CSS Variable |
|---|---|---|
| Background | #FAF9F7 | --color-solid-bg |
| Surface | #FFFFFF | --color-solid-surface |
| Text Primary | #1A1A1A | --color-solid-text |
| Text Secondary | #6B6B6B | --color-solid-text-secondary |
| Text Tertiary | #9E9E9E | --color-solid-text-tertiary |
| Border | #E8E6E1 | --color-solid-border |
| Accent | #2E4A3A | --color-solid-accent |
| Accent Hover | #1F3528 | --color-solid-accent-hover |
| Accent Subtle | #EFF2EF | --color-solid-accent-subtle |
| Error | #C44E4E | --color-solid-error |

## Typography (Inter, system sans-serif)

| Token | Size/Line-height | Weight | Usage |
|---|---|---|---|
| display | 56px/1.1 (3.5rem) | 600 | Hero headline desktop |
| display-mobile | 40px/1.15 (2.5rem) | 600 | Hero headline mobile |
| h1 | 40px/1.2 (2.5rem) | 600 | Section headlines |
| h1-mobile | 32px/1.2 (2rem) | 600 | Section headlines mobile |
| h2 | 28px/1.3 (1.75rem) | 600 | Sub-section headlines |
| h3 | 20px/1.4 (1.25rem) | 600 | Card titles |
| body | 17px/1.6 | 400 | Body copy |
| body-large | 20px/1.55 | 400 | Hero subheadline |
| body-small | 15px/1.5 | 400 | Captions, footer |
| label | 14px/1.4 | 500 | Buttons, nav |
| label-small | 12px/1.4 | 500 | Overlines |

## Spacing (4px base)
container-max: 1120px, container-narrow: 720px
Section padding: py-28 md:py-32
Section gap: 120px desktop, 80px mobile

## Components Needed

### Button (src/components/ui/Button.tsx)
Variants: filled (bg-solid-accent, white), outline (transparent, accent border), ghost (transparent)
Sizes: sm (px-4 py-2), md (px-6 py-3.5), lg (px-8 py-4)
All: rounded-lg, label font, focus:ring-2 focus:ring-solid-accent/20

### Input (src/components/ui/Input.tsx)
bg-solid-surface border border-solid-border rounded-lg px-5 py-3.5 text-[17px]
Focus: border-solid-accent ring-2 ring-solid-accent/20
Error: border-solid-error ring-2 ring-solid-error/20

### Container (src/components/ui/Container.tsx)
max-w-[1120px] mx-auto px-5 md:px-8 (narrow: max-w-[720px])

### Section (src/components/ui/Section.tsx)
py-28 md:py-32. tinted variant: bg-solid-accent-subtle/50

### SectionLabel (src/components/ui/SectionLabel.tsx)
text-xs font-medium uppercase tracking-widest text-solid-accent

### IconCard (src/components/landing/IconCard.tsx)
bg-solid-surface border border-solid-border rounded-xl p-8. Icon + title + description. Optional number.

### DimensionItem (src/components/landing/DimensionItem.tsx)
Icon (32x32, text-solid-accent) + label + short description. No card background.

### AudienceCard (src/components/landing/AudienceCard.tsx)
bg-solid-accent-subtle/50 rounded-xl p-8. Title + description. No icon.

### WaitlistForm (src/components/landing/WaitlistForm.tsx)
Email input + submit button + trust line. States: default, submitting (spinner), success ("You're on the list"), error.
Client-side email validation. For now, just console.log the email (Supabase integration later).

### Footer (src/components/Footer.tsx)
Logo + tagline, link groups, copyright. Minimal.

## Landing Page Sections (in src/app/page.tsx)

### 1. Navigation
Fixed, frosted glass (bg-solid-bg/80 backdrop-blur-md), 64px height, border-b border-solid-border on scroll.
Logo left: "SolidGround" in Inter Semibold 18px.
CTA right: small filled "Join Waitlist" button. No hamburger.
Smooth-scroll to waitlist section on click.

### 2. Hero
Centered, narrow container. pt-40 md:pt-48 pb-28 md:pb-32.
Overline: "Introducing Compatibility Blueprint"
Headline: "Understand your relationship compatibility before you commit." (display size)
Subheadline: "Dating apps optimize for attraction. SolidGround maps the dimensions that actually predict long-term success — values, communication, finances, and more."
CTA row: "Join the Waitlist" filled button + "Learn what you'll discover ↓" text link.

### 3. The Problem
Centered, narrow. bg-solid-bg.
Label: "The Problem"
Headline: "Attraction isn't compatibility."
Body: Two short paragraphs about dating apps vs relationship intelligence.

### 4. How It Works
Centered headline + 4-column grid (2-col tablet, 1-col mobile).
4 numbered IconCards:
1. Take the Assessment (ClipboardText icon, ~15 min)
2. Get Your Blueprint (FileText icon)
3. Understand Compatibility (Graph icon)
4. Make Informed Decisions (Path/CheckCircle icon)

### 5. What You'll Discover
Split layout (stack on mobile): headline left, 3×2 grid right.
6 DimensionItems: Values (Compass), Communication (Chats), Finances (CurrencyDollar), Lifestyle (Clock), Growth (TrendUp), Deal Breakers (ShieldWarning)

### 6. Why SolidGround
Centered headline "Intelligence over instinct" + 4-column grid.
4 IconCards: Explainable AI (Brain), Evidence-Informed (Flask), Privacy-First (ShieldCheck), Human-Centered (HandHeart)

### 7. For Who
Centered headline "Clarity, whatever your stage" + 3-column grid.
3 AudienceCards: Individuals seeking clarity, Couples before commitment, Coaches & professionals

### 8. Waitlist CTA
Centered, tinted background (bg-solid-accent-subtle/50).
Headline: "Be the first to know when SolidGround launches."
Subheadline + WaitlistForm component + trust line "No spam. Unsubscribe anytime."

### 9. Footer
Minimal: logo + tagline, link columns (Product, Company), copyright.

## Icons
Use inline SVGs (simple geometric icons). No icon library dependency — keep it lightweight.
Each icon: 24x24 or 32x32, stroke-width 1.5, currentColor.

## Responsive
- All grids: 4→2→1 column (md:2, lg:3 or lg:4)
- Hero CTA: row→stacked on mobile
- WaitlistForm: inline row→stacked on mobile
- What You'll Discover: split→stacked on mobile
- Min touch targets 44x44px
- No hamburger menu

## Animation
- No entrance animations on load
- Subtle fade-up on scroll: opacity 0→1, translateY 20px→0, 600ms ease-out (IntersectionObserver)
- Button/input transitions: 150-200ms ease
- smooth-scroll on html
- NO parallax, scroll-jacking, or particle effects

## Copy Rules
- Headlines: 5-12 words, declarative (not questions)
- Body: 2-3 sentences max per paragraph
- Never "swipe" except in Problem section
- Never "find your soulmate" or similar
- No exclamation marks
- Contractions fine (you're, it's)

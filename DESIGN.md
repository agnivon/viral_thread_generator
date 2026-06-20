---
version: alpha
name: Viral Thread Generator Design System
description: Next-gen AI Creator Studio visual identity featuring deep violet/indigo gradients, Geist typography, and glassmorphic card overlays.
colors:
  primary: "#171717"
  primary-foreground: "#ffffff"
  background: "#ffffff"
  foreground: "#171717"
  card: "#ffffff"
  card-foreground: "#171717"
  popover: "#ffffff"
  popover-foreground: "#171717"
  secondary: "#f3f4f6"
  secondary-foreground: "#171717"
  muted: "#f3f4f6"
  muted-foreground: "#4b5563"
  accent: "#f3f4f6"
  accent-foreground: "#171717"
  destructive: "#dc2626"
  destructive-foreground: "#ffffff"
  border: "#e5e7eb"
  input: "#e5e7eb"
  ring: "#d1d5db"
  brand-violet: "#7c3aed"
  brand-indigo: "#4f46e5"
  brand-cyan: "#a5f3fc"
  success: "#065f46"
  success-bg: "#d1fae5"
  warning: "#92400e"
  warning-bg: "#fef3c7"

typography:
  headline:
    fontFamily: Geist Sans
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: -0.02em
  body:
    fontFamily: Geist Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Geist Sans
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: 0.05em

rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  body:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  badge-default:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-muted:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  button-primary:
    backgroundColor: "{colors.brand-violet}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  hero-accent:
    backgroundColor: "{colors.brand-indigo}"
    textColor: "{colors.brand-cyan}"
  border-preview:
    backgroundColor: "{colors.border}"
  input-preview:
    backgroundColor: "{colors.input}"
  ring-preview:
    backgroundColor: "{colors.ring}"
  primary-preview:
    backgroundColor: "{colors.primary}"
---

## Overview

The **Viral Thread Generator** interface evokes a modern, premium AI Creator Studio. The visual style is clean and energetic, pairing dark/light high-contrast neutrals with luminous accents (violet, indigo, and cyan gradients) that represent AI creativity. Smooth backdrop-blur glassmorphic layers give the interface a high-end, responsive feel.

The layout optimizes information density, keeping core generators and metrics clean while prioritizing clarity on both mobile and desktop screens.

## Colors

The design system is centered on a flexible neutral core and accent gradients that elevate key interactions:

- **Neutral Core:** White/Dark Grey backgrounds (`#ffffff` / `#171717`) and crisp grey borders/inputs.
- **AI Accents:** Luminous Violet (`#7c3aed`) and Indigo (`#4f46e5`) drive active states, highlights, and main CTAs.
- **Grades & Statuses:** Emerald (`#065f46`) on light green (`#d1fae5`) represents high virality and success, while Amber/Brown (`#92400e`) on light yellow (`#fef3c7`) represents warnings and pending critiques.

## Typography

The typography scale relies on **Geist Sans** (with fallback to system-ui sans-serif fonts) to ensure clean, high-legibility layout for dense lists, draft items, and metrics:

- **Headlines:** Dynamic sizes from `1.75rem` up to `3rem` (for landing pages) with extra-bold weights (`900`) and tight letter-spacing.
- **Body Text:** Standard body is set to `1rem` or `0.875rem` (`14px`) with a comfortable `1.5` line-height.
- **Labels & Badges:** Set to `0.75rem` (`12px`) with semi-bold or bold weights for rapid scanning of statuses, categories, and ratings.

## Layout & Spacing

A strict modular spacing scale governs paddings, margins, and gaps across all page components:

- **Grid Gap:** Grid containers utilize `1.5rem` (`24px`) spacing on desktops and `1rem` (`16px`) on mobile devices.
- **Container Padding:** Desktop layouts use a maximum width container with `2rem` (`32px`) padding, scaling down to `1rem` (`16px`) padding on mobile.
- **High Density Tables:** Spacings in table rows and detail sheets are compressed to `0.75rem` (`12px`) to present maximum info without clutter.

## Elevation & Depth

Interfaces build depth using subtle layers, borders, and backdrop filters rather than heavy drop-shadows:

- **Flat Borders:** Cards and containers use a crisp `1px` border (`#e5e7eb` or `#374151` in dark mode) to define outlines.
- **Backdrop Blur:** Modal popovers, sidebar overlays, and custom cards use `backdrop-filter: blur(8px)` with semi-transparent surfaces (`rgba(255, 255, 255, 0.4)` or `rgba(23, 23, 23, 0.4)`) to evoke a sense of physical layering.

## Shapes

Shapes utilize organic, soft rounded radiuses to keep the interface friendly and modern:

- **Large Surfaces:** Main cards and modals use `16px` (`xl`) rounded corners.
- **Controls & Buttons:** Standard buttons, form fields, and input blocks use `8px` (`md`) or `12px` (`lg`) rounded corners.
- **Tags & Badges:** Micro-badges (e.g., status flags) use fully rounded (`9999px`) pill shapes.

## Components

Core UI primitives map to specific token assignments to guarantee visual parity:

- **Card:** Employs `{colors.card}` surface color, `{rounded.xl}` corner radius, and `{spacing.lg}` internal padding.
- **Badge:** Employs a fully rounded pill shape (`{rounded.full}`) with light background padding.
- **Primary Button:** Employs the luminous brand violet (`{colors.brand-violet}`) as the background, white text (`{colors.primary-foreground}`), and `{rounded.xl}` corners.

## Do's and Don'ts

### Do's
- **Do** use the gradient accents primarily for hero elements, primary action buttons, and active tabs.
- **Do** ensure contrast compliance on dark and light modes, particularly when utilizing semantic status colors.
- **Do** compress margins on mobile screens to avoid badges or ratings being cut off.

### Don'ts
- **Don't** use neon accent colors for standard body copy or secondary tags.
- **Don't** mix hard corner styles (sharp 0px) and soft rounded corners (16px) within the same page card or widget.

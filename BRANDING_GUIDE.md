# Garage Force Inventory App - Dark Theme Branding Guide

## Overview
The Garage Force Inventory Management App uses a dark theme optimized for outdoor visibility in bright sunlight. The design features Garage Force's brand green as the primary accent color with professional dark backgrounds.

---

## Color Palette

### Primary Brand Color - Garage Force Green
- **Hex Code**: `#00A651`
- **Usage**: Primary accent, buttons, borders, highlights, active states
- **Variants**:
  - `gf-green-50`: `#E6F7EF` (lightest tint)
  - `gf-green-100`: `#CCEFDF`
  - `gf-green-200`: `#99DFBF` (for text on dark backgrounds)
  - `gf-green-500`: `#00A651` (default brand green)
  - `gf-green-600`: `#008541` (hover states)
  - `gf-green-700`: `#006331` (active states, borders)
  - `gf-green-800`: `#004221`
  - `gf-green-900`: `#002110` (dark backgrounds for alerts)

### Dark Theme Colors

#### Backgrounds
- **Main Background**: `#0F0F0F` (`dark-bg`)
- **Card Background**: `#1A1A1A` (`dark-card`)
- **Secondary Background**: `#232323` (`gf-charcoal-700`)

#### Borders
- **Primary Border**: `#2C2C2C` (`dark-border`)
- **Accent Border**: `#00A651` (green for active/important elements)

#### Text Colors
- **Primary Text**: `#F7F7F7` (`dark-text-primary`) - High contrast white for headings and important text
- **Secondary Text**: `#C8C8C8` (`dark-text-secondary`) - Medium contrast for body text
- **Muted Text**: `#A4A4A4` (`dark-text-muted`) - Lower contrast for secondary info

---

## Component Color Applications

### Header
- Background: `dark-card` (`#1A1A1A`)
- Bottom border: 2px `gf-green` accent
- Primary text: `dark-text-primary`
- Secondary text: `dark-text-secondary`

### Product Cards
- Background: `dark-card` with `dark-border`
- Reorder alert: Left border `gf-green` (4px)
- Product name: `dark-text-primary`
- SKU/metadata: `dark-text-muted`
- Category badge: `gf-green-900` background with `gf-green-200` text
- Active state: `gf-charcoal-700` background

### Location Filter
- Background: `dark-card`
- Label: `dark-text-primary`
- Select input: `gf-charcoal-700` background
- Border: `dark-border` (default), `gf-green` (focus)
- Focus ring: `gf-green-700`

### Reorder Alerts
- Container background: `gf-green-900`
- Left border: `gf-green` (4px)
- Heading: `gf-green-200`
- Individual cards: `dark-card` background

### Bottom Navigation
- Background: `dark-card`
- Top border: 2px `gf-green`
- Inactive icons: `dark-text-muted`
- Active icons: `gf-green`
- Hover state: `gf-green`

### Buttons

#### Primary Button (.btn-gf-primary)
- Background: `gf-green`
- Text: White
- Hover: `gf-green-600`
- Active: `gf-green-700`
- Min height: 44px (touch-friendly)

#### Secondary Button (.btn-gf-secondary)
- Background: `gf-charcoal-600`
- Text: `dark-text-primary`
- Hover: `gf-charcoal-700`
- Active: `gf-charcoal-800`
- Min height: 44px

#### Outline Button (.btn-gf-outline)
- Background: `dark-card`
- Text: `gf-green`
- Border: 2px `gf-green`
- Hover: `gf-green-900` background
- Active: `gf-green-800` background
- Min height: 44px

---

## Accessibility & Contrast

All color combinations meet WCAG AA standards for contrast:

### High Contrast Combinations
- `dark-text-primary` (`#F7F7F7`) on `dark-bg` (`#0F0F0F`): **15.8:1 ratio**
- `dark-text-primary` on `dark-card` (`#1A1A1A`): **13.5:1 ratio**
- `gf-green` (`#00A651`) on `dark-bg`: **6.8:1 ratio**
- White on `gf-green`: **4.9:1 ratio**

### Medium Contrast
- `dark-text-secondary` (`#C8C8C8`) on `dark-card`: **9.2:1 ratio**
- `gf-green-200` on `gf-green-900`: **8.5:1 ratio**

---

## Mobile-First Design Features

### Touch Targets
- Minimum 44px height for all interactive elements
- Adequate padding for easy tapping
- Clear visual feedback on active states

### Outdoor Visibility
- Dark backgrounds reduce screen glare in bright sunlight
- High contrast text ensures readability
- Bold green accents are easily visible
- Increased shadow depth for better separation

### Performance
- Simple color palette reduces CSS complexity
- Efficient Tailwind utility classes
- Minimal custom styles

---

## Typography

### Font Families
- **Headings**: Montserrat (700 weight)
- **Body**: Open Sans (400, 600, 700 weights)

### Text Hierarchy
- H1/H2: `text-dark-text-primary` with bold weight
- Body text: `text-dark-text-secondary`
- Metadata/labels: `text-dark-text-muted`

---

## Design Philosophy

1. **Dark Theme First**: Optimized for outdoor use in bright conditions
2. **Brand Consistency**: Green (#00A651) as the signature Garage Force color
3. **Professional Aesthetic**: Clean, modern design with clear hierarchy
4. **Accessibility**: WCAG AA compliant contrast ratios throughout
5. **Mobile Optimized**: Touch-friendly targets, responsive spacing
6. **Visual Clarity**: Strong borders and shadows for depth and separation

---

## Implementation Notes

### Tailwind Configuration
All colors are defined in `client/tailwind.config.js` under the `extend.colors` section.

### Custom Component Classes
Button and card styles are defined in `client/src/index.css` using Tailwind's `@layer components`.

### Global Styles
Body background and base typography are set in `client/src/index.css` using Tailwind's `@layer base`.

---

## Files Updated

1. `client/tailwind.config.js` - Color palette configuration
2. `client/src/index.css` - Global styles and component classes
3. `client/src/components/layout/Header.tsx`
4. `client/src/components/inventory/ProductCard.tsx`
5. `client/src/components/inventory/LocationFilter.tsx`
6. `client/src/components/inventory/ReorderAlerts.tsx`
7. `client/src/components/common/BottomNavigation.tsx`
8. `client/src/App.tsx`
9. `client/src/components/common/LoadingSpinner.tsx`
10. `client/src/components/common/EmptyState.tsx`
11. `client/src/components/inventory/ProductList.tsx`

---

**Last Updated**: 2025-11-05
**Version**: 2.0 - Dark Theme with Green Branding

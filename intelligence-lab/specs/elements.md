# 📋 Elements Specification Document - Intelligence Lab v1.0

**Document Type**: Technical Specification  
**Version**: 1.0  
**Date**: 29/07/2025  
**Status**: Approved  
**Location**: `/intelligence-lab/specs/elements.md`

---

## 1. Executive Summary

### 1.1 Purpose
This document formalizes the UI element specifications for the Intelligence Lab interface v1.0, establishing standards for current implementation and future maintenance.

### 1.2 Scope
- Complete UI element inventory
- Dimensional specifications
- Color system documentation
- Interaction patterns
- Responsive behavior guidelines

### 1.3 Key Achievement
- **Problem Solved**: Navigation elements consuming 30% of useful space
- **Solution**: Compact UI design prioritizing strategic data visualization
- **Result**: 25% increase in data display area

---

## 2. Design System Foundation

### 2.1 Design Principles
1. **Data First**: Strategic information takes precedence over navigation
2. **Compact Efficiency**: Maximum information density without sacrificing usability
3. **Visual Hierarchy**: Clear distinction between primary data and UI chrome
4. **Accessibility**: Maintains WCAG AA compliance despite size reduction

### 2.2 Grid System
```
Base Grid: 8px (0.5rem)
Micro Grid: 4px (0.25rem) - for fine adjustments
Macro Grid: 16px (1rem) - for major sections
```

---

## 3. Element Specifications

### 3.1 Layout Architecture

#### 3.1.1 Container System
| Element | Property | Value | Notes |
|---------|----------|-------|-------|
| .container | max-width | 1600px | Increased from 1400px |
| .container | padding | 0 10px | Reduced from 0 20px |
| .main-layout | grid-template-columns | 180px 1fr | Sidebar + Content |
| .main-layout | gap | 0.5rem | Reduced from 1rem |

#### 3.1.2 Dimensional Constants
```css
/* Critical Dimensions */
--sidebar-width: 180px;        /* Fixed width */
--header-height: 50px;         /* Approximate rendered height */
--min-content-width: 320px;    /* Mobile minimum */
--max-content-width: 1420px;   /* 1600px - 180px sidebar */
```

### 3.2 Component Specifications

#### 3.2.1 Header Component
| Property | Value | Calculation | Purpose |
|----------|-------|-------------|---------|
| padding | 0.5rem 0 | 8px vertical | Minimal chrome |
| logo font-size | 1.125rem | 18px | Brand visibility |
| status font-size | 0.75rem | 12px | Secondary info |
| total height | ~50px | Calculated | Compact header |

#### 3.2.2 Sidebar Navigation
| Property | Value | Details |
|----------|-------|---------|
| width | 180px | Fixed, non-responsive |
| padding | 1rem | 16px all sides |
| nav-item padding | 0.5rem 0.75rem | 8px × 12px |
| nav-item font | 0.875rem | 14px |
| section heading | 0.625rem | 10px, uppercase |
| margin between sections | 1rem | 16px |

#### 3.2.3 Content Area
| Property | Value | Purpose |
|----------|-------|---------|
| padding | 1.5rem | 24px - comfortable reading |
| header margin | 0.75rem | 12px - section separation |
| h2 font-size | 1.125rem | 18px - section titles |
| p font-size | 0.75rem | 12px - descriptions |

#### 3.2.4 Card System
```
Standard Card:
- padding: 0.75rem (12px)
- margin-bottom: 0.75rem (12px)
- border: 2px solid var(--border-light)
- border-radius: 6px
- h3 font-size: 0.875rem (14px)

Metric Card:
- padding: 0.625rem (10px)
- border: 2.5px solid (category-specific)
- metric-value: 1.25rem (20px)
- metric-label: 0.625rem (10px)
```

#### 3.2.5 Interactive Elements

**Buttons**
| Type | Padding | Font | Border |
|------|---------|------|--------|
| Primary | 0.5rem 0.875rem | 0.8125rem | 2px solid |
| Secondary | 0.5rem 0.875rem | 0.8125rem | 2px solid |
| Icon-only | 0.5rem | - | 2px solid |

**Form Controls**
| Element | Padding | Font | Height |
|---------|---------|------|--------|
| Input | 0.375rem 0.5rem | 0.75rem | ~28px |
| Select | 0.375rem 0.5rem | 0.75rem | ~28px |
| Textarea | 0.5rem | 0.75rem | Variable |

### 3.3 Modal System
```
Modal Container:
- padding: 1rem (16px)
- max-width: 700px
- width: 95%
- max-height: 90vh
- margin: 2% auto
- border-radius: 8px

Modal Header:
- margin-bottom: 0.75rem
- font-size: 1.125rem
```

---

## 4. Color System

### 4.1 Base Palette
```css
/* Primary Colors */
--primary: #5b8def;      /* Interactive elements */
--secondary: #4ade80;    /* Success states */
--accent: #fbbf24;       /* Warnings */
--danger: #f87171;       /* Errors */

/* Dark Mode Grays - Photosensitivity Optimized */
--bg-base: #2a2d33;      /* Main background */
--bg-elevated: #33373f;  /* Cards, elevated elements */
--bg-hover: #3d424b;     /* Hover states */
--bg-modal: #373b44;     /* Modal overlays */
```

### 4.2 Semantic Category Colors
| Category | Color | Hex | Usage |
|----------|-------|-----|-------|
| Breakthrough | Purple | #7c3aed | Technical breakthroughs |
| Evolution | Blue | #2563eb | Conceptual evolution |
| Moment | Red | #dc2626 | Decisive moments |
| Insight | Green | #059669 | Strategic insights |
| Learning | Orange | #d97706 | General learning |

### 4.3 Border System
- Default width: 2px
- Category borders: 2.5px (increased visibility)
- Focus borders: 2px solid var(--primary)
- Hover transitions: 0.2s ease

---

## 5. Typography Scale

### 5.1 Font Size System
```css
--font-2xs: 0.625rem;    /* 10px - Minimum readable */
--font-xs: 0.75rem;      /* 12px - Labels, captions */
--font-sm: 0.8125rem;    /* 13px - Body small */
--font-base: 0.875rem;   /* 14px - Default body */
--font-lg: 1.125rem;     /* 18px - Headings */
--font-xl: 1.25rem;      /* 20px - Values */
--font-2xl: 1.5rem;      /* 24px - Page titles */
```

### 5.2 Font Hierarchy
1. **Page Title**: 1.125rem (reduced from 1.75rem)
2. **Section Title**: 0.875rem
3. **Body Text**: 0.75rem
4. **Labels**: 0.625rem
5. **Values**: 1.25rem (metrics only)

---

## 6. Spacing System

### 6.1 Spacing Scale
```css
--spacing-2xs: 0.125rem;  /* 2px */
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.375rem;   /* 6px */
--spacing-md: 0.5rem;     /* 8px - Base unit */
--spacing-lg: 0.75rem;    /* 12px */
--spacing-xl: 1rem;       /* 16px */
--spacing-2xl: 1.5rem;    /* 24px */
```

### 6.2 Application Rules
- **Inline spacing**: Use xs-sm (2-6px)
- **Component spacing**: Use md-lg (8-12px)
- **Section spacing**: Use xl-2xl (16-24px)
- **Minimum clickable area**: 32×32px

---

## 7. Responsive Behavior

### 7.1 Breakpoints
```css
/* Desktop First Approach */
@media (max-width: 1600px) { /* Large screens */ }
@media (max-width: 1366px) { /* Standard laptops */ }
@media (max-width: 1024px) { /* Tablets/Small laptops */ }
@media (max-width: 768px)  { /* Mobile devices */ }
```

### 7.2 Responsive Rules
1. **1600px+**: Full layout as specified
2. **1366px**: Slight font size reduction (0.95x)
3. **1024px**: Sidebar to icon-only mode
4. **768px**: Stack layout, hide sidebar

---

## 8. Animation & Transitions

### 8.1 Transition Timing
```css
--transition-fast: 0.2s ease;     /* Hover states */
--transition-normal: 0.3s ease;   /* Layout changes */
--transition-slow: 0.5s ease;     /* Page transitions */
```

### 8.2 Animation Guidelines
- Hover effects: 0.2s max
- Color transitions: ease function
- Layout shifts: Avoid or use slow timing
- Loading states: Infinite rotation at 1s

---

## 9. Component States

### 9.1 Interactive States
| State | Visual Change |
|-------|--------------|
| Default | Base styling |
| Hover | Background: var(--bg-hover), Border: highlight |
| Active | Background: var(--primary), Color: inverted |
| Focus | Border: 2px solid var(--primary) |
| Disabled | Opacity: 0.5, Cursor: not-allowed |

### 9.2 Loading States
- Spinner: 40×40px, 3px border
- Rotation: 1s linear infinite
- Color: var(--primary) on var(--bg-hover)

---

## 10. Accessibility Compliance

### 10.1 WCAG AA Standards
- **Contrast Ratios**: Minimum 4.5:1 for normal text
- **Target Size**: Minimum 32×32px clickable area
- **Focus Indicators**: Visible 2px border
- **Font Size**: Minimum 10px (0.625rem)

### 10.2 Keyboard Navigation
- Tab order: Logical top-to-bottom, left-to-right
- Focus trap: Modals contain tab navigation
- Skip links: Hidden but available
- Escape key: Closes modals and dropdowns

---

## 11. Performance Metrics

### 11.1 Rendering Performance
- CSS Variables: Instant theme switching
- No JavaScript layout: CSS Grid/Flexbox only
- Transition limit: Maximum 3 concurrent
- Animation GPU: Transform and opacity only

### 11.2 Asset Optimization
- Single CSS file: ~15KB minified
- No external fonts: System fonts only
- Icons: Unicode emoji (no downloads)
- Images: None required for UI

---

## 12. Maintenance Guidelines

### 12.1 Modification Rules
1. **Never go below minimum sizes** (see Section 10.1)
2. **Maintain 8px grid alignment** where possible
3. **Test at all breakpoints** before deployment
4. **Document custom modifications** in `/specs/custom/`

### 12.2 Version Control
- Tag UI changes with version numbers
- Document breaking changes
- Maintain backwards compatibility for 2 versions
- Archive deprecated styles in `/specs/archive/`

### 12.3 Testing Checklist
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest version)
- [ ] Mobile browsers (iOS Safari, Chrome Android)
- [ ] Screen readers (NVDA, JAWS)
- [ ] Zoom levels (75% - 200%)

---

## 13. Future Roadmap

### 13.1 Version 1.1 (Q3 2025)
- Collapsible sidebar implementation
- Density toggle (compact/normal/comfortable)
- Dark/Light theme switcher
- Customizable accent colors

### 13.2 Version 2.0 (Q4 2025)
- Fully responsive grid system
- Component library extraction
- Theme marketplace
- User preference persistence

---

## 14. Appendices

### 14.1 Quick Reference
```css
/* Copy-paste starter */
.new-component {
    padding: var(--spacing-md);
    margin: var(--spacing-sm);
    font-size: var(--font-base);
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-md);
    transition: var(--transition-fast);
}
```

### 14.2 Related Documents
- `/elements/UI-SPECIFICATIONS-V1.md` - Detailed before/after
- `/elements/css-variables-v1.css` - CSS reference
- `/elements/ui-comparison-guide.md` - Visual comparisons

---

**Document Control**
- **Author**: Intelligence Lab Team
- **Reviewer**: UI/UX Team
- **Approval**: Product Management
- **Next Review**: Q3 2025

---

**END OF SPECIFICATION DOCUMENT**
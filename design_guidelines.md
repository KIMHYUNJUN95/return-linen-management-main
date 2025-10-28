# Hotel Management System PWA - Design Guidelines

## Design Approach

**Selected Approach**: Custom Futuristic Design System with 3D Elements
**Rationale**: Enterprise hotel management system requiring futuristic aesthetics with Three.js 3D animated backgrounds while maintaining professional functionality and usability for field and office staff.

**Key Design Principles**:
- Futuristic minimalism - clean interfaces with subtle sci-fi elements
- Glass morphism for depth and modern appeal
- Performance-first 3D backgrounds that don't compromise usability
- Professional yet innovative visual language
- Mobile-first responsive design for field staff

## Core Design Elements

### A. Color Palette

**Dark Mode** (Primary Interface):
- Background Base: 220 25% 8%
- Background Elevated: 220 20% 12%
- Background Glass: 220 20% 15% with 60% opacity
- Primary Accent: 200 100% 65% (Cyan-blue for futuristic feel)
- Secondary Accent: 280 80% 70% (Purple for highlights)
- Success: 150 70% 55%
- Warning: 40 90% 60%
- Error: 0 85% 65%
- Text Primary: 220 15% 95%
- Text Secondary: 220 10% 70%
- Border Subtle: 220 20% 25%

**Light Mode** (Office Alternative):
- Background: 220 20% 98%
- Surface: 220 25% 100%
- Primary Accent: 200 90% 45%
- Text: 220 30% 15%

### B. Typography

**Font Families**:
- Primary: 'Inter' for UI elements and body text (Google Fonts)
- Accent: 'Orbitron' for headers and futuristic elements (Google Fonts)
- Monospace: 'JetBrains Mono' for IDs and technical data

**Type Scale**:
- Display (Hero): text-5xl to text-7xl, font-bold, Orbitron
- H1: text-3xl to text-4xl, font-semibold, Orbitron
- H2: text-2xl to text-3xl, font-semibold
- H3: text-xl to text-2xl, font-medium
- Body: text-base, font-normal
- Small: text-sm, font-normal
- Caption: text-xs, font-light

### C. Layout System

**Spacing Units**: Use Tailwind spacing of 2, 4, 8, 12, 16, 24 as primary scale (p-2, m-4, gap-8, etc.)

**Grid Structure**:
- Desktop dashboard: 12-column grid with sidebar (max-w-7xl)
- Tablet: 8-column adaptive grid
- Mobile: Single column with bottom navigation
- Card spacing: gap-4 on mobile, gap-6 on desktop

**Glass Morphism Containers**:
- Background: bg-white/10 dark mode, bg-black/5 light mode
- Backdrop blur: backdrop-blur-lg
- Border: border border-white/20
- Shadow: shadow-2xl with colored glow

### D. 3D Background System

**Three.js Implementation**:
- Floating geometric objects (low-poly crystals, spheres)
- Subtle particle field with depth
- Slow rotation and floating animation (2-4 second cycles)
- Responsive to mouse/touch movement (parallax effect)
- Performance: Limit to 20-30 objects, optimize for mobile
- Color scheme: Match primary cyan-blue with purple accents
- Depth layers: Background particles (dim), mid-ground objects (medium), foreground glow

**Background Behavior**:
- Dashboard: Active 3D with interactive parallax
- Forms/Data Entry: Simplified static version or subtle particles only
- Loading states: Gentle pulsing animation on 3D elements

### E. Component Library

**Navigation**:
- Top bar: Glass morphism with logo, search, notifications, profile
- Sidebar (desktop): Collapsible with icons and labels, glass effect
- Bottom nav (mobile): Fixed glass bar with 4-5 key actions
- Active state: Primary accent glow and subtle scale

**Cards**:
- Glass morphism base with subtle border
- Hover: Lift effect (translate-y-1) with enhanced glow
- Corner accent: Thin colored border on top-left
- Padding: p-6 desktop, p-4 mobile

**Buttons**:
- Primary: Gradient background (cyan to purple), bold text, shadow-lg
- Secondary: Glass morphism with border, backdrop blur
- Icon buttons: Circular, glass effect with icon-only
- Sizes: h-10 default, h-12 large, h-8 small
- Hover: Glow effect and slight scale (scale-105)

**Form Inputs**:
- Glass morphism background with subtle border
- Focus: Primary accent border with glow
- Labels: Floating labels with animation
- Icons: Left-aligned icons in input fields
- Height: h-12 for touch-friendly mobile use

**Data Tables**:
- Glass morphism rows with hover highlight
- Sticky header with enhanced glass effect
- Alternating row opacity for readability
- Mobile: Card view transformation
- Actions: Icon buttons with tooltips

**Modals/Dialogs**:
- Full-screen overlay with backdrop blur
- Centered glass morphism container
- Animated entrance: Scale and fade from center
- Close: Top-right X button with hover glow

**Status Indicators**:
- Pill-shaped badges with glass effect
- Color-coded by state (success, pending, error)
- Subtle pulse animation for active states
- Icons paired with text for clarity

**Charts/Visualizations**:
- Gradient fills matching color palette
- Glass morphism tooltips on hover
- Cyan primary data, purple secondary
- Animated entrance on load

### F. Animations

**Use Sparingly**:
- Page transitions: 200ms fade
- Card hover: 150ms lift and glow
- Button interactions: 100ms scale
- 3D background: Continuous slow motion (no user-triggered animation)
- Loading: Gradient shimmer on glass elements
- Data updates: Subtle highlight flash

**Performance**:
- Use CSS transforms (not position changes)
- Prefer opacity and scale over complex animations
- Reduce motion for accessibility (prefers-reduced-motion)

## PWA-Specific Design

**App Icon**: Futuristic hotel icon with gradient (cyan to purple)
**Splash Screen**: 3D logo animation on glass background
**Install Prompt**: Custom banner with glass morphism
**Offline Indicator**: Top banner with retry action
**Update Notification**: Non-intrusive toast with install button

## Images

**Hero/Dashboard Header** (if applicable):
- Optional: Futuristic hotel interior or abstract 3D visualization
- Treatment: Overlay with gradient (dark bottom for text legibility)
- Size: Full-width, h-64 desktop, h-48 mobile

**Placeholder States**:
- Empty states: Minimalist line illustrations with futuristic style
- No images for operational screens - focus on data clarity

## Accessibility

- WCAG AA contrast ratios maintained despite glass effects
- Focus indicators: 2px primary accent outline with offset
- Keyboard navigation: All interactive elements accessible
- Screen reader: Proper ARIA labels on all components
- Dark mode by default with light mode toggle
- Text remains readable over 3D backgrounds (always use overlay/glass containers for content)
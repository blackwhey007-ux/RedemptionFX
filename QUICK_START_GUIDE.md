# RedemptionFX Theme System - Quick Start Guide

## 🚀 Your Theme System is Ready!

Everything has been set up and is working. Here's how to use it:

---

## ✅ What's Already Done

1. ✅ **5 CSS Files Created** in `/styles/` directory
2. ✅ **Theme Toggle** created in `/src/lib/theme-toggle.ts`
3. ✅ **Layout Updated** with theme imports and initialization
4. ✅ **Theme Toggle Component** updated to use new system
5. ✅ **Dark Mode** set as default
6. ✅ **No Existing Functionality Changed** - everything still works!

---

## 🎨 How to Use the Theme

### Option 1: Using Utility Classes (Easiest)

Replace hardcoded styles with utility classes:

```tsx
// OLD WAY (hardcoded):
<button style={{ backgroundColor: '#ef4444', padding: '12px 24px' }}>
  Click Me
</button>

// NEW WAY (theme classes):
<button className="btn btn-primary">
  Click Me
</button>
```

### Option 2: Using CSS Variables

```tsx
// Use CSS variables in inline styles:
<div style={{
  background: 'var(--gradient-primary)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)'
}}>
  Content
</div>
```

### Option 3: Using Component Classes

```tsx
// Cards
<div className="card">Basic Card</div>
<div className="card-glass">Glass Card with blur</div>

// Inputs
<input className="input" placeholder="Email" />
<textarea className="textarea" placeholder="Message" />

// Badges
<span className="badge badge-primary">New</span>
<span className="badge badge-success">Active</span>
```

---

## 🌓 Theme Toggle

The theme toggle button in your header already works! Users can switch between dark and light modes.

To add more theme toggles elsewhere:

```tsx
import { toggleTheme } from '@/lib/theme-toggle'

function MyComponent() {
  return (
    <button onClick={toggleTheme}>
      Toggle Theme
    </button>
  )
}
```

---

## 🎯 Common Use Cases

### 1. Creating a Button

```tsx
// Primary button (red gradient)
<button className="btn btn-primary">Save</button>

// Secondary button (gold gradient)
<button className="btn btn-secondary">Subscribe</button>

// Ghost button (transparent)
<button className="btn btn-ghost">Cancel</button>

// Different sizes
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary btn-lg">Large</button>

// With animation
<button className="btn btn-primary hover-lift">Animated</button>
```

### 2. Creating a Card

```tsx
// Basic card
<div className="card p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

// Glass effect card
<div className="card-glass p-6">
  <h3>Glassmorphism Card</h3>
  <p>With backdrop blur</p>
</div>

// Elevated card with hover effect
<div className="card-elevated hover-lift p-6">
  <h3>Interactive Card</h3>
  <p>Lifts on hover</p>
</div>
```

### 3. Form Inputs

```tsx
<div>
  <label className="label">Email Address</label>
  <input 
    type="email" 
    className="input" 
    placeholder="you@example.com"
  />
</div>

<div>
  <label className="label">Message</label>
  <textarea 
    className="textarea" 
    placeholder="Your message here"
    rows={4}
  />
</div>

<div>
  <label className="label">Country</label>
  <select className="select">
    <option>United States</option>
    <option>United Kingdom</option>
  </select>
</div>
```

### 4. Layout with Flexbox

```tsx
// Center content
<div className="flex-center gap-4">
  <button className="btn btn-primary">Button 1</button>
  <button className="btn btn-secondary">Button 2</button>
</div>

// Space between
<div className="flex-between p-4">
  <h2>Title</h2>
  <button className="btn btn-ghost">Action</button>
</div>

// Vertical stack
<div className="flex-col gap-4">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
</div>
```

### 5. Grid Layouts

```tsx
// 3-column grid
<div className="grid grid-cols-3 gap-6">
  <div className="card">Card 1</div>
  <div className="card">Card 2</div>
  <div className="card">Card 3</div>
</div>

// Responsive grid (1 col mobile, 2 tablet, 3 desktop)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="card">Responsive Card 1</div>
  <div className="card">Responsive Card 2</div>
  <div className="card">Responsive Card 3</div>
</div>
```

### 6. Animations

```tsx
// Fade in animation
<div className="animate-fade-in">
  Content fades in
</div>

// Slide in from bottom
<div className="animate-fade-in-up">
  Slides up and fades in
</div>

// Hover effects
<div className="hover-lift">
  Lifts on hover
</div>

// Phoenix glow effect (brand specific)
<div className="animate-phoenix-glow">
  Phoenix effect
</div>

// Gold glow (brand specific)
<span className="animate-gold-glow gold-crown">👑</span>
```

### 7. Text Styling

```tsx
// Brand gradient text
<h1 className="redemption-brand text-5xl">
  REDEMPTIONFX
</h1>

// Colored text
<p className="text-brand-red">Red text</p>
<p className="text-brand-gold">Gold text</p>

// Text sizes
<h1 className="text-5xl font-black">Huge heading</h1>
<h2 className="text-3xl font-bold">Large heading</h2>
<p className="text-base text-secondary">Body text</p>
<small className="text-sm text-muted">Small text</small>

// Text alignment
<p className="text-center">Centered</p>
<p className="text-right">Right aligned</p>
```

### 8. Spacing

```tsx
// Padding
<div className="p-4">Padding all sides</div>
<div className="px-6 py-4">Padding horizontal and vertical</div>

// Margin
<div className="mt-4">Margin top</div>
<div className="mb-6">Margin bottom</div>
<div className="mx-auto">Centered with auto margin</div>

// Gaps (for flex/grid)
<div className="flex gap-4">Items with gap</div>
<div className="grid gap-6">Grid with gap</div>
```

---

## 🎨 Brand-Specific Classes

RedemptionFX has special classes for your brand identity:

```tsx
// Phoenix Rising gradient text
<h1 className="redemption-brand">
  Rise from Ashes to Gold
</h1>

// Gold crown with glow
<span className="gold-crown">👑</span>

// Phoenix glow animation
<div className="animate-phoenix-glow">
  Your content
</div>

// Fire glow animation (red)
<div className="animate-fire-glow">
  Your content
</div>

// Gold glow animation
<div className="animate-gold-glow">
  Your content
</div>

// Neon flicker effect
<h2 className="animate-neon-flicker">
  Flickering gold text
</h2>
```

---

## 📱 Responsive Design

Use responsive prefixes to change styles at different screen sizes:

```tsx
// Hidden on mobile, visible on desktop
<div className="hidden md:block">
  Desktop content
</div>

// Visible on mobile, hidden on desktop
<div className="block md:hidden">
  Mobile content
</div>

// Responsive text size
<h1 className="text-3xl md:text-4xl lg:text-5xl">
  Scales with screen size
</h1>

// Responsive grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

Breakpoints:
- `sm:` - 640px and up (small tablets)
- `md:` - 768px and up (tablets)
- `lg:` - 1024px and up (laptops)
- `xl:` - 1280px and up (desktops)

---

## 🔄 Editing the Theme

### To Change Colors

Edit `/styles/theme-dark.css` or `/styles/theme-light.css`:

```css
:root[data-theme="dark"] {
  --color-primary: #your-new-red;
  --color-secondary: #your-new-gold;
}
```

### To Add New Animations

Edit `/styles/animations.css`:

```css
@keyframes yourAnimation {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-your-animation {
  animation: yourAnimation 500ms ease;
}
```

### To Add New Component Styles

Edit `/styles/components.css`:

```css
.your-component {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

---

## 🐛 Common Issues

### Issue: Theme not applying
**Solution**: Clear browser cache and restart dev server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Issue: Colors look wrong
**Solution**: Make sure you're using CSS variables, not hardcoded colors

### Issue: Theme toggle not working
**Solution**: Check that `ThemeToggle` component is rendered in your layout

### Issue: Animations too fast/slow
**Solution**: Edit duration in `/styles/theme-dark.css`:
```css
--transition-fast: 150ms; /* Make it slower: 300ms */
--transition-base: 300ms; /* Make it slower: 500ms */
```

---

## 📊 Available Utility Classes

### Buttons
- `btn` (base)
- `btn-primary` (red)
- `btn-secondary` (gold)
- `btn-ghost` (transparent)
- `btn-sm`, `btn-lg`, `btn-xl` (sizes)

### Cards
- `card` (basic)
- `card-glass` (glassmorphism)
- `card-elevated` (with shadow)
- `card-gradient` (gradient border)

### Layout
- `flex`, `flex-col`, `flex-center`, `flex-between`
- `grid`, `grid-cols-2`, `grid-cols-3`, `grid-cols-4`
- `gap-1` through `gap-16`

### Spacing
- `m-*` (margin), `p-*` (padding)
- `mt-*`, `mb-*`, `ml-*`, `mr-*`
- `mx-*`, `my-*`, `px-*`, `py-*`

### Text
- `text-xs` through `text-5xl` (sizes)
- `font-bold`, `font-black`, `font-medium`
- `text-primary`, `text-secondary`, `text-muted`
- `text-center`, `text-left`, `text-right`

### Colors
- `text-brand-red`, `text-brand-gold`
- `bg-primary`, `bg-secondary`, `bg-card`
- `bg-gradient-primary`, `bg-gradient-secondary`

### Animations
- `animate-fade-in`, `animate-fade-in-up`
- `animate-slide-in-right`, `animate-slide-in-left`
- `animate-bounce`, `animate-pulse`, `animate-float`
- `animate-gold-glow`, `animate-fire-glow`, `animate-phoenix-glow`
- `hover-lift`, `hover-glow`, `hover-scale`

### Borders
- `border`, `border-2`, `border-4`
- `border-default`, `border-gold`, `border-error`
- `rounded`, `rounded-lg`, `rounded-xl`, `rounded-full`

### Shadows
- `shadow-sm`, `shadow`, `shadow-lg`, `shadow-xl`
- `shadow-glow`, `shadow-inner`

---

## ✅ Next Steps

1. **Test the theme toggle** - Click the theme toggle in your header
2. **Try utility classes** - Replace hardcoded styles with theme classes
3. **Explore animations** - Add hover effects and animations to your components
4. **Customize colors** - Edit theme files to match your exact preferences
5. **Read full guide** - Check `THEME_SYSTEM_GUIDE.md` for complete documentation

---

## 🎉 You're All Set!

Your RedemptionFX platform now has a complete, professional theme system.

**Everything is centralized, customizable, and ready to use!**

**Phoenix Rising - From Ashes to Gold! 🔥👑**


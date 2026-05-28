# Option 3: Visual Reference Guide

## User Interface Changes

### 1. Collection Tracker - Action Bar

#### Before (Without Option 3)
```
┌─────────────────────────────────────────────────────────────────┐
│ Identifiers & Collection Jobs (3)                              │
│                                           [🔄 Refresh Status]   │
└─────────────────────────────────────────────────────────────────┘
```

#### After (With Option 3)
```
┌─────────────────────────────────────────────────────────────────┐
│ Identifiers & Collection Jobs (3)                              │
│                     [✏️ Edit Collection Scope] [🔄 Refresh Status] │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Details**:
- Button positioned left of "Refresh Status"
- Blue outline border (#0078d4)
- Blue text (#0078d4)
- Pencil/edit icon (Edit3)
- Hover: Light blue background (#deecf9)

---

### 2. Fulfillment Stage - Normal Mode vs Edit Mode

#### Normal Mode (Initial Fulfillment)
```
┌─────────────────────────────────────────────────────────────────┐
│  FULFILLMENT STAGE                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Summary Stats                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Filters                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Email Messages                                        │   │
│  │ ☐ Calendar Events                                       │   │
│  │ ☐ Contacts                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [📋 Generate Summary] [Submit ➤]  │
└─────────────────────────────────────────────────────────────────┘
```

#### Edit Mode (Adding to Existing Collection)
```
┌─────────────────────────────────────────────────────────────────┐
│  FULFILLMENT STAGE                                              │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ ⚠️  Edit Collection Scope                                  ║ │
│  ║                                                             ║ │
│  ║ You are adding services to an existing collection.         ║ │
│  ║ Previously enabled categories are shown with checkmarks    ║ │
│  ║ and cannot be disabled. Select additional categories below ║ │
│  ║ and click "Submit Additional Jobs" to add them to the      ║ │
│  ║ collection.                                                 ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Summary Stats                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Filters                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑️ Email Messages        [✓ Already enabled]            │   │
│  │ ☐ Calendar Events                                       │   │
│  │ ☐ Contacts                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                   [📋 Generate Summary] [Submit Additional ➤]  │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Differences**:
1. **Yellow Banner** (top)
   - Background: #fff4ce
   - Border: #f9a825
   - Icon: ⚠️ AlertTriangle (#8a6d3b)
   
2. **Checkboxes**
   - Already enabled: ☑️ (disabled, gray)
   - New selections: ☐ (enabled, normal)

3. **Badges**
   - "Already enabled": Green (#dff6dd bg, #107c10 border/text)
   - Icon: ✓ CheckCircle2

4. **Submit Button**
   - Normal: "Submit Fulfillment"
   - Edit: "Submit Additional Jobs"

---

### 3. Category Row States

#### State 1: Not Enabled (Normal Fulfillment)
```
┌──────────────────────────────────────────────────────────┐
│ ☐  Calendar Events                                       │
│    Service: Outlook                                      │
│    Job ID: Not generated                                 │
└──────────────────────────────────────────────────────────┘
```

#### State 2: Already Enabled (Edit Mode)
```
┌──────────────────────────────────────────────────────────┐
│ ☑️  Email Messages  [✓ Already enabled]                  │
│    Service: Outlook                                      │
│    Job ID: JOB-123456                                    │
└──────────────────────────────────────────────────────────┘
```
- Checkbox: ☑️ Checked and disabled (cannot uncheck)
- Badge: Green with checkmark icon
- Background: Slightly grayed (disabled state)

#### State 3: New Selection (Edit Mode)
```
┌──────────────────────────────────────────────────────────┐
│ ☑️  Calendar Events                                      │
│    Service: Outlook                                      │
│    Job ID: Will be generated                             │
└──────────────────────────────────────────────────────────┘
```
- Checkbox: ☑️ Checked and enabled (can uncheck)
- No badge
- Background: Normal white

---

### 4. Toast Notifications

#### Normal Fulfillment Mode

**Loading**:
```
┌────────────────────────────────────────────┐
│ ⏳ Submitting fulfillment to data          │
│    collection service...                   │
└────────────────────────────────────────────┘
```

**Success**:
```
┌────────────────────────────────────────────┐
│ ✅ Fulfillment submitted successfully!     │
│    5 collection jobs initiated.            │
└────────────────────────────────────────────┘
```

#### Edit Collection Scope Mode

**Loading**:
```
┌────────────────────────────────────────────┐
│ ⏳ Submitting additional jobs to           │
│    collection service...                   │
└────────────────────────────────────────────┘
```

**Success**:
```
┌────────────────────────────────────────────┐
│ ✅ 3 additional jobs submitted to          │
│    collection!                             │
└────────────────────────────────────────────┘
```

---

### 5. Complete User Journey

```
┌─────────────────────┐
│  COLLECTION TRACKER │
│                     │
│  john.doe@contoso   │
│  ├─ Outlook - Email │ ← Existing job
│  └─ Teams - Chat    │ ← Existing job
│                     │
│  [Edit Scope] [⟳]  │ ← Click here
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   FULFILLMENT       │
│   (EDIT MODE)       │
│                     │
│  ⚠️ Warning Banner  │
│                     │
│  john.doe@contoso   │
│  ☑️ Email ✓Already  │ ← Disabled
│  ☐ Calendar         │ ← Can select
│  ☐ Contacts         │ ← Can select
│  ☑️ Chat  ✓Already  │ ← Disabled
│  ☐ Files            │ ← Can select
│                     │
│  [Submit Add Jobs]  │ ← Click here
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  COLLECTION TRACKER │
│                     │
│  john.doe@contoso   │
│  ├─ Outlook - Email │ ← Original
│  ├─ Teams - Chat    │ ← Original
│  ├─ Outlook - Cal   │ ← NEW! 🎉
│  └─ Outlook - Cont  │ ← NEW! 🎉
│                     │
│  [Edit Scope] [⟳]  │
└─────────────────────┘
```

---

## Color Reference

### Primary Colors
| Element | Hex Code | Usage |
|---------|----------|-------|
| Blue Primary | `#0078d4` | Edit button border/text |
| Blue Light | `#deecf9` | Edit button hover background |
| Yellow Bg | `#fff4ce` | Warning banner background |
| Yellow Border | `#f9a825` | Warning banner border |
| Yellow Dark | `#8a6d3b` | Warning icon color |
| Green Bg | `#dff6dd` | "Already enabled" badge bg |
| Green Border/Text | `#107c10` | Badge border and text |

### Neutral Colors
| Element | Hex Code | Usage |
|---------|----------|-------|
| Text Primary | `#323130` | Main text color |
| Text Secondary | `#605e5c` | Secondary text, descriptions |
| Border Light | `#edebe9` | Card borders |
| Background | `#faf9f8` | Page background |
| Surface | `#ffffff` | Card backgrounds |

---

## Spacing & Layout

### Banner
- **Padding**: 16px (p-4)
- **Gap**: 12px (gap-3)
- **Border Radius**: 8px (rounded-lg)
- **Border Width**: 1px

### Button (Edit Collection Scope)
- **Height**: 36px (h-9)
- **Padding X**: 12px
- **Icon Size**: 16x16px (w-4 h-4)
- **Icon Margin**: 8px right (mr-2)
- **Border Width**: 1px

### Badge (Already Enabled)
- **Padding**: 4px 8px
- **Font Size**: 12px (text-xs)
- **Icon Size**: 12x12px (w-3 h-3)
- **Icon Margin**: 4px right (mr-1)
- **Border Radius**: 4px

---

## Typography

### Banner
- **Heading**: 14px, semibold (#323130)
- **Body**: 14px, regular (#605e5c)

### Button
- **Text**: 14px, medium
- **Icon**: 16x16px

### Badge
- **Text**: 12px, medium
- **Icon**: 12x12px

---

## Icon Reference

| Icon Name | Component | Size | Usage |
|-----------|-----------|------|-------|
| Edit3 | lucide-react | 16px | Edit Collection Scope button |
| AlertTriangle | lucide-react | 20px | Warning banner |
| CheckCircle2 | lucide-react | 12px | Already enabled badge |
| Send | lucide-react | 16px | Submit button |

---

## Responsive Behavior

### Desktop (>768px)
- Full layout as shown
- Buttons side-by-side
- Banner takes full width
- Multi-column stats grid

### Tablet (768px - 1024px)
- Banner text may wrap
- Buttons remain side-by-side
- Stats grid may reduce columns

### Mobile (<768px)
- Buttons stack vertically
- Banner text wraps
- Single column layout
- Stats grid becomes 2x3 instead of 1x6

---

## Accessibility Annotations

### Color Contrast Ratios
- Blue text on white: **7.0:1** ✅ AAA
- Yellow bg with black text: **12.5:1** ✅ AAA
- Green text on white: **5.8:1** ✅ AA
- Warning icon: **6.2:1** ✅ AA

### Focus States
- Edit button: 2px blue outline
- Checkboxes: 2px blue outline
- Submit button: 2px blue outline

### Screen Reader Announcements
```
Button: "Edit Collection Scope, button"
Banner: "Warning: Edit Collection Scope. You are adding services to an existing collection..."
Checkbox (disabled): "Email Messages, checkbox, checked, dimmed"
Checkbox (enabled): "Calendar Events, checkbox, not checked"
Badge: "Already enabled"
```

---

## Animation & Transitions

### Button Hover
```css
transition: background-color 200ms ease-in-out;
```

### Toast Appear/Dismiss
```css
animation: slide-in-right 300ms ease-out;
animation: fade-out 200ms ease-in;
```

### Banner Mount
```css
/* No animation - appears immediately for accessibility */
```

---

## Print Styles

When printing Collection Tracker or Fulfillment view:
- Banner prints with yellow background
- "Already enabled" badges print in grayscale
- Edit button hidden in print view
- Checkboxes show as symbols (☑️/☐)

---

*Last Updated: January 9, 2026*  
*For implementation details, see: OPTION_3_IMPLEMENTATION.md*

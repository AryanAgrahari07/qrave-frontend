# Visual Guide - Dialog Layouts & Interactions

## 🎨 NEW ORDER Dialog

### Desktop Layout (Split-Screen):

```
┌─────────────────────────────────────────────────────────────────┐
│  🛒 NEW ORDER           [Table 5]                               │
├────────────────────────────────────────┬────────────────────────┤
│ MENU SECTION (Left)                   │ CART SECTION (Right)   │
├────────────────────────────────────────┼────────────────────────┤
│                                        │                        │
│  Filters: 🍽️ 🥗 🍗                    │  Current Order:        │
│                                        │  ┌──────────────────┐  │
│  APPETIZERS                           │  │ Samosa        $3  │  │
│  ┌────────────────┐ ┌──────────────┐  │  │ [−] 1 [+]   [X]  │  │
│  │ Samosa + $3    │ │ Paneer +  $6 │  │  │                  │  │
│  │                │ │              │  │  │ Garlic Naan   $4 │  │
│  │   Blue accent  │ │   Blue acc.  │  │  │ [−] 2 [+]   [X]  │  │
│  │   on hover ▶   │ │              │  │  │                  │  │
│  └────────────────┘ └──────────────┘  │  │ Coke         $2  │  │
│                                        │  │ [−] 1 [+]   [X]  │  │
│  MAIN COURSES                         │  │                  │  │
│  ┌────────────────┐ ┌──────────────┐  │  │  Total:      $13 │  │
│  │ Butter Chicken │ │ Paneer Tikka │  │  │ [CONFIRM]        │  │
│  │ + $10          │ │ + $12        │  │  └──────────────────┘  │
│  │                │ │              │  │                        │
│  └────────────────┘ └──────────────┘  │                        │
│                                        │                        │
│  BREADS                               │                        │
│  ┌────────────────┐ ┌──────────────┐  │                        │
│  │ Roti        +  │ │ Paratha    + │  │                        │
│  │ $2             │ │ $3           │  │                        │
│  └────────────────┘ └──────────────┘  │                        │
│                                        │                        │
└────────────────────────────────────────┴────────────────────────┘
```

### Mobile Layout (Stacked):

```
┌───────────────────────────┐
│ 🛒 NEW ORDER [Table 5]    │
├───────────────────────────┤
│ Filters: 🍽️ 🥗 🍗         │
├───────────────────────────┤
│ APPETIZERS                │
│ ┌─────────────┐           │
│ │ Samosa    + │- 1 +      │
│ │ $3          │           │
│ └─────────────┘           │
│ ┌─────────────┐           │
│ │ Paneer    + │- 0 +      │
│ │ $6          │           │
│ └─────────────┘           │
│                           │
│ MAIN COURSES              │
│ ┌─────────────┐           │
│ │ Butter      │- 1 +      │
│ │ Chicken $10 │           │
│ └─────────────┘           │
│ ....                      │
│                           │
│                           │
│                           │   
│                           │
│                           │ 
├───────────────────────────┤
│ (2) View items            │
│                           │
│ Total:            $13     │
│ [CONFIRM]                 │
└───────────────────────────┘
```

---

## 🎨 ADD ITEMS TO ORDER Dialog

### Full Layout (Desktop):

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✏️ ADD ITEMS         [Table 5]                                      │
│  Modify quantities or add new items                                  │
├──────────────────────────────────────────────────────────────────────┤
│ CURRENT ORDER ITEMS (Auto-Save) - Scrollable max-height [240px]    │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ Biryani        Size: Large   $8    [−] 2 [+]  Auto-saves ✓    │  │
│ │ (Blue highlight section)                                      │  │
│ │ Naan           Size: Plain   $3    [−] 1 [+]  Auto-saves ✓    │  │
│ │                                                                │  │
│ │ Coke           -             $2    [−] 2 [+]  Auto-saves ✓    │  │
│ └────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────┬──────────────────────────────┤
│ MENU (Select new items)               │ NEW ITEMS TO ADD (Sidebar)   │
├────────────────────────────────────────┤  ┌──────────────────────────┤
│                                        │  │ New Items (2 qty)       │  │
│  Filters: 🍽️ 🥗 🍗                    │  ├──────────────────────────┤  │
│                                        │  │                          │  │
│  APPETIZERS                           │  │ Chicken Tikka       $10 │  │
│  ┌────────────────┐ ┌──────────────┐  │  │ [−] 1 [+]  [Remove]    │  │
│  │ Samosa      +  │ │ Paneer    +  │  │  │                        │  │
│  │ $3             │ │ $6           │  │  │ Garlic Naan        $4  │  │
│  └────────────────┘ └──────────────┘  │  │ [−] 1 [+]  [Remove]    │  │
│                                        │  │                        │  │
│  MAIN COURSES                         │  │ Total:           $24   │  │
│  ┌────────────────┐ ┌──────────────┐  │  │ [ADD TO ORDER]         │  │
│  │ Butter Chicken │ │ Paneer Tikka │  │  └──────────────────────────┘  │
│  │ + $10          │ │ + $12        │  │                                │
│  │ (Click +)  ▶   │ │              │  │                                │
│  └────────────────┘ └──────────────┘  │                                │
│                                        │                                │
│  BREADS                               │                                │
│  ┌────────────────┐ ┌──────────────┐  │                                │
│  │ Garlic Naan +  │ │ Plain Naan + │  │                                │
│  │ $4             │ │ $3           │  │                                │
│  └────────────────┘ └──────────────┘  │                                │
└────────────────────────────────────────┴──────────────────────────────┘
```

---

## 🎯 Button & Control Styles

### Quantity Controls (Current Items - Auto-Save):

```
Current Order Item:
┌────────────────────────────────────────┐
│ Biryani         Size: Large   $8       │
│                                        │
│  [−]   2   [+]                       │
│  Light Blue  Hover: bg-blue-100      │
│  h-7 w-7                             │
└────────────────────────────────────────┘

Shows: MEDIUM blue quantity display
Saves IMMEDIATELY when clicked
```

### Quantity Controls (New Items):

```
New Items Cart:
┌────────────────────────────────────────┐
│ Chicken Tikka                    $10  │
│                                        │
│  [−]   1   [+]                       │
│  Dark slate  Hover: bg-slate-600    │
│  h-7 w-7                             │
└────────────────────────────────────────┘

Shows: DARK BLUE quantity display
NOT auto-saved until "Add to Order" clicked
```

### Menu Item Buttons:

```
┌─────────────────────────────────────┐
│ Chicken Tikka        [🎨 Customize] │
│ Price: $10                          │
│                                     │
│  Blue accent on hover ──────►  [+] │
│  Smooth transition                  │
│  Shadow on hover                    │
└─────────────────────────────────────┘

Click [+] → Added to New Items cart
```

---

## 🎨 Color Indicators

### Item Card Backgrounds:

```
CURRENT ORDER ITEMS (Auto-Save):
┌─────────────────────────────────┐
│ Background: LIGHT BLUE          │
│ from-blue-50 to-blue-50/50      │
│ Border: border-blue-200         │
│                                 │
│ Shows items are CURRENT in order│
└─────────────────────────────────┘

NEW ITEMS SECTION (Dark Sidebar):
┌─────────────────────────────────┐
│ Background: DARK SLATE          │
│ bg-slate-700/40                 │
│ Border: border-slate-600        │
│                                 │
│ Shows items are NEW/staging     │
└─────────────────────────────────┘

MENU ITEMS (White):
┌─────────────────────────────────┐
│ Background: WHITE               │
│ bg-white                        │
│ Border: border-slate-200        │
│                                 │
│ Shows items are in MENU         │
└─────────────────────────────────┘
```

---

## 📱 Responsive Behavior

### Desktop (>1024px):
```
┌──────────────────────────────────────────────────┐
│ CURRENT ITEMS (Top - max-h-[240px])            │
├────────────────────────┬─────────────────────────┤
│ MENU (Left)           │ NEW ITEMS (Right)       │
│ Flex-1                 │ W-96 lg:w-[420px]       │
└────────────────────────┴─────────────────────────┘
```

### Tablet (640-1024px):
```
┌──────────────────────────────────────┐
│ CURRENT ITEMS (Top)                 │
├──────────────────┬───────────────────┤
│ MENU             │ NEW ITEMS        │
│ Flex-1           │ W-80             │
└──────────────────┴───────────────────┘
```

### Mobile (<640px):
```
┌─────────────────────┐
│ CURRENT ITEMS       │
├─────────────────────┤
│ MENU                │
│ (Scrollable)        │
├─────────────────────┤
│ NEW ITEMS           │
│ (Full width)        │
└─────────────────────┘
```

---

## 🎯 User Interactions

### Adding Item to New Order:

```
1. Click menu item [+]
   ↓
2. Item appears in right cart
   ├─ With quantity display
   ├─ With +/− buttons
   └─ With X button
   ↓
3. Adjust quantity as needed
   ├─ [−] decreases
   ├─ Number shows current qty
   └─ [+] increases
   ↓
4. Click CONFIRM
   └─ Order placed
```

### Adjusting Current Item Quantity:

```
1. See current items at TOP (blue background)
   ↓
2. Click [+] or [−] on quantity
   ↓
3. **INSTANTLY SAVES** to database
   ↓
4. Toast shows: "Quantity updated"
   ↓
5. No additional clicks needed!
```

### Adding New Items:

```
1. Current items show at top (already saved)
   ↓
2. Click [+] on menu item
   ↓
3. Item appears in RIGHT sidebar (dark)
   ↓
4. Adjust quantity with +/−
   ↓
5. Click "ADD TO ORDER"
   ↓
6. Items added to current order
   ↓
7. Sidebar clears
```

---

## 🌈 Color Palette Visual

```
┌─────────────────────────────────────────────────────────┐
│ DARK THEME (Sidebars & Headers)                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ████████████████████████████████████ (slate-950)  │  │
│ │ ████████████████████████████████████ (slate-900)  │  │
│ │ ████████████████████████████████████ (slate-800)  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ LIGHT THEME (Menu & Cards)                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (white)  │  │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ (slate-50) │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ACCENT COLORS                                           │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ██ (blue-600)     Primary interactions            │  │
│ │ ██ (green-600)    Success, confirm               │  │
│ │ ██ (red-500)      Delete, remove                 │  │
│ │ ██ (amber-500)    Icons, highlights              │  │
│ │ ██ (blue-50)      Current items background       │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Layout Hierarchy

### Header:
```
Large icon + Title + Badge
Dark gradient background
Subtitle text below
```

### Sections:
```
Filter Bar (top)
├─ Sticky position
├─ Dietary filter buttons
└─ Shadow below

Main Content (scrollable)
├─ Categories with items
├─ 2-column grid
└─ Blue accent on hover

Footer (bottom)
├─ Borders on top
├─ Total calculation
└─ Action button (green)
```

---

## ✨ Animation & Transitions

### Hover Effects:

```
Menu Items:
┌─────────────────────────────────────┐
│ Normal:    border-slate-200         │
│            bg-white                 │
│                                     │
│ Hover:     border-blue-500   ▶      │
│            bg-blue-50               │
│            shadow-lg                │
│            smooth 200ms transition  │
└─────────────────────────────────────┘
```

### Button States:

```
Normal:    bg-blue-600
Hover:     bg-blue-700
Active:    scale-95 (pressed)
Disabled:  opacity-50, cursor-not-allowed
Loading:   Spinner animation
```

### Toast Notifications:

```
Success:   Green toast
"Quantity updated" or "Item added"
Auto-dismiss after 3s

Error:     Red toast
"Failed to update"
Auto-dismiss after 5s
```

---

## 🎯 Visual Design Summary

| Element | Style | Purpose |
|---------|-------|---------|
| **Headers** | Dark gradient, white text | High visual importance |
| **Sidebars** | Dark theme, white text | Professional premium feel |
| **Menu Items** | White cards, blue hover | Clear interaction target |
| **Current Items** | Blue background | Distinguish from menu |
| **New Items** | Dark background | Show pending status |
| **Quantity Display** | Large, bold text | Easy to read |
| **Buttons** | Color-coded, smooth hover | Clear action intent |
| **Badges** | Color+icon | Quick information |
| **Shadows** | Subtle depth | Professional appearance |

---

**This visual guide shows exactly how the dialogs look and behave!**

Refer to this when customizing or debugging the UI.

---

**Last Updated:** February 2, 2026
**Status:** ✅ Complete Visual Reference

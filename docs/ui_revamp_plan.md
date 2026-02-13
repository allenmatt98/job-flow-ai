# UI Revamp Plan: Job Flow AI

## 1. Executive Summary
This document limits the scope to **UI/UX improvements** for the "Job Flow AI" browser extension and dashboard. The goal is to transition from a functional "debug" aesthetic to a polished, professional, and "premium" user experience, taking inspiration from industry standards like "Simplify".

**Key Objectives:**
1.  **Fix Interaction**: Ensure extension side panel opens reliably on icon click.
2.  **Side Panel Redesign**: Move away from a "form-first" approach to a "value-first" approach (Time Saved pitch + Contextual Actions).
3.  **Dashboard Polish**: Transform the cramped data-entry look into a spacious, professional command center.

---

## 2. Extension Configuration & Interaction

**Problem:** The extension icon is reported as "not clickable" or not opening the side panel intuitively.
**Root Cause:** Missing `action` definition in `manifest.json`.

### Proposed Changes
1.  **Update `manifest.json`**:
    *   Add `"action": { "default_title": "Open Job Flow AI" }`.
    *   Ensure `permissions` include `sidePanel`.
2.  **Background Script (`background/index.js`)**:
    *   Verify `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` is active.
    *   *Self-Correction*: This logic is already present in `index.js`, so the manifest fix should solve it.

---

## 3. Side Panel Revamp (The "Simplify" Aesthetic)

**Current State:** A tabbed interface ("Profile" vs "Job Context") that exposes too many raw fields and toggles immediately.
**Target State:** A sleek, context-aware companion.

### Design Principles
*   **Dark & Premium:** Deep midnight blues (`#0f172a`), vibrant accents (Electric Blue/Green), Glassmorphism effects.
*   **Context-First:** The UI changes based on whether the user is on a supported job board (Greenhouse, Lever, etc.) or a random page.
*   **Value-Driven:** Show "Time Saved" metrics front and center.

### New Layout Structure

#### A. Header
*   **Left**: Logo/Brand Icon (Clean, minimal).
*   **Right**: Settings Cog (Links to Dashboard), Minimize/Close.

#### B. Hero Section (The "Pitch")
*   **Dynamic Component**:
    *   *If Job Detected:* "Ready to Apply?"
    *   *Default:* "You've saved **45 mins** this week."
*   **Visuals**: Progress ring or simple stat card.

#### C. Primary Action Area
*   **Smart Button**:
    *   **State 1 (Job Board Detected):** Large, pulsing "Autofill Application" button.  
        *   *Subtext:* "Detected Greenhouse Job Board".
    *   **State 2 (Generic Page):** "Scan for Job Details" or "Paste Resume".

#### D. Quick Actions (Secondary)
*   **Grid layout** of icon-based actions:
    *   [Generate Cover Letter]
    *   [View Resume]
    *   [Edit Profile] (Opens Dashboard)

#### E. Footer
*   **Status Bar**: "v1.2.0 • Pro" (or similar status indicator).

### Technical Tasks
*   [ ] Create `components/SidePanel/HeroSection.jsx`.
*   [ ] Create `components/SidePanel/ActionBoard.jsx`.
*   [ ] Refactor `App.jsx` to remove tabs and use a "View State" model (Home vs. Operation).
*   [ ] Implement "Time Saved" tracking in `storage.js`.

---

## 4. Dashboard Revamp (The "Professional" Look)

**Current State:** Cramped inputs, `bg-slate-900` blocks, lack of hierarchy.
**Target State:** Spacious, organized, legible.

### Design Principles
*   **Spaciousness:** Increase padding (`p-4` -> `p-6` or `p-8`). Maximize width usage.
*   **Data Density:** Reduce visual noise. Use table layouts for lists (Experience/Education) instead of repetitive cards where appropriate, or highly styled cards.
*   **Typography:** Use a modern sans-serif (Inter or Outfit). Increase Header sizes (`text-3xl`).

### Specific Section Improvements

#### 1. Sidebar Navigation
*   **Change:** Increase item height/padding. Add subtle hover effects (glow or localized highlight).
*   **Addition:** Add a "Home/Overview" tab at the top.

#### 2. Profile Management (Experience/Education)
*   **Current:** Vertical stack of edit forms.
*   **New:**
    *   **View Mode:** List of items (Company, Role, Dates) with "Edit" and "Delete" actions.
    *   **Edit Mode:** Modal or slide-over drawer for editing a specific item. This reduces clutter significantly.

#### 3. Application History
*   **Current:** Basic table.
*   **New:**
    *   **Kanban Request?** (Maybe later). For now, a polished Data Grid.
    *   **Status Badges:** Pill-shaped, distinctive colors (Green for Offer, Grey for Rejected).
    *   **Filters:** stylized dropdowns, not default HTML selects.

#### 4. Saved Answers
*   **Current:** JSON-like list.
*   **New:**
    *   **Accordion/Card Grid:** Group answers by category if possible, or just cleaner cards with "Copy" and "Edit" buttons on hover.

### Technical Tasks
*   [ ] Install `tailwind-merge` and `clsx` for cleaner class management (if not present).
*   [ ] Create reusable UI primitives: `Card`, `Button`, `PageHeader`, `Modal`.
*   [ ] Refactor `OptionsApp.jsx` to use these primitives.
*   [ ] Extract `components/Dashboard/Sidebar.jsx` and `components/Dashboard/ExperienceList.jsx` to separate files.

---

## 5. Implementation Roadmap

### Phase 1: Foundation & Extension Config
1.  Fix `manifest.json`.
2.  Set up new standard UI constants (colors, shadows, spacing variables) in `index.css`.

### Phase 2: Side Panel (High User Impact)
1.  Build the "Hero" and "Smart Button" components.
2.  Wire up the "Job Detection" logic to the UI state.
3.  Implement the "Pitch" metrics.

### Phase 3: Dashboard (Deep Polish)
1.  Refactor Dashboard layout.
2.  Implement "View vs Edit" pattern for complex lists.
3.  Final visual polish check.

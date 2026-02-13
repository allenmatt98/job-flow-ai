# Phase 2: Memory Layer — Implementation Plan & Status

## Status: COMPLETE

All 6 steps implemented and build verified.

---

## Problem

Job applications repeatedly ask the same questions that aren't part of the standard profile:
- "Do you require visa sponsorship?"
- "Are you legally authorized to work in the US?"
- "What is your desired salary?"
- "Are you willing to relocate?"

These are detected as `type: 'unknown'` in heuristics and **skipped** during autofill. Users re-answer them on every application.

## Solution

A persistent memory layer that learns answers from user-filled fields and replays them on future applications.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Learning trigger | Explicit "Save Answers" button | Form submit detection is fragile across ATS sites (AJAX, SPA). Users control what gets saved. |
| Key normalization | Lowercase + sorted tokens + stopword removal | Human-readable keys for Options page. SmartMatcher fuzzy lookup handles question variations. |
| Storage | `chrome.storage.local` key `answerMemory` | No backend/API needed. Purely client-side. |
| Priority | Profile data first, then memory | Memory never overrides profile fields (name, email, etc.). |

## Storage Schema

```
chrome.storage.local key: 'answerMemory'
{
  "require sponsorship visa": {
    question: "Do you require visa sponsorship?",  // original text
    answer: "No",
    fieldTag: "select",
    lastUsed: 1707600000000,
    useCount: 5
  },
  ...
}
```

---

## Implementation Steps

### Step 1: `AnswerMemory.js` (NEW FILE)
**File**: `extension/src/utils/AnswerMemory.js`

Core memory service with:
- `normalizeQuestion(text)` — lowercase, strip punctuation, remove stopwords, sort tokens, join
- `getAnswerMemory()` / `saveAnswerMemory(memory)` — chrome.storage.local wrappers
- `learnAnswer(question, answer, fieldTag)` — save single Q&A, increments `useCount`
- `learnAnswers(entries[])` — batch save from SAVE_ANSWERS message
- `recallAnswer(questionLabel)` — find answer via exact key lookup then SmartMatcher fuzzy fallback
- `deleteAnswer(normalizedKey)` / `updateAnswer(normalizedKey, newAnswer)` — CRUD for Options page

### Step 2: Storage wrappers
**File**: `extension/src/utils/storage.js`

Added `getAnswerMemory()` and `saveAnswerMemory(memory)` thin wrappers following existing `getProfile`/`saveProfile` pattern.

### Step 3: Memory recall + capture in HeuristicStrategy
**File**: `extension/src/content/strategies/HeuristicStrategy.js`

**3a. Memory fill pass in `autofill()`**:
- After the existing profile-fill loop (Pass 1), added Pass 2 for unknown fields
- Filters `this.pageFields` for `type === 'unknown'` with a label and empty value
- Calls `recallAnswer(field.label)` via dynamic import
- Fills with appropriate confidence level (HIGH for exact, MEDIUM for fuzzy)

**3b. `captureUnknownAnswers()` method**:
- Iterates unknown fields with labels
- SELECT: captures `options[selectedIndex].text` (human-readable), skips index 0 placeholders
- Radio: finds checked option in group, gets its label text
- Checkbox: captures "Yes" if checked
- Text inputs: captures trimmed value
- Returns `[{ question, answer, fieldTag }]`

### Step 4: `SAVE_ANSWERS` message handler
**File**: `extension/src/content/index.js`

New handler alongside SCAN_PAGE, AUTOFILL, GET_PAGE_TEXT:
- Calls `currentStrategy.captureUnknownAnswers()`
- Dynamic imports `AnswerMemory.learnAnswers()` to batch-save
- Returns `{ saved: N, totalStored: N }`
- Graceful error if strategy doesn't support capture

### Step 5: "Save Answers" button in side panel
**File**: `extension/src/App.jsx`

- New state: `autofillDone`, `savingAnswers`, `saveResult`
- After autofill succeeds, shows "Save Answers to Memory" button
- Descriptive label: "Filled in some questions manually? Save them for next time."
- Shows result: "Saved 3 answers (12 total in memory)"

### Step 6: "Saved Answers" tab in Options page
**File**: `extension/src/options/OptionsApp.jsx`

- New sidebar nav item with HelpCircle icon (after Resume, before History divider)
- Empty state: icon + explanation text
- List view: sorted by useCount descending, each entry shows question (bold), clickable answer (inline edit), metadata (use count, field type, last used date), delete button (Trash2, hover reveal)
- Inline edit: click answer -> input field + Save button (Enter/Escape support)

---

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `extension/src/utils/AnswerMemory.js` | **Created** | Done |
| `extension/src/utils/storage.js` | **Modified** — added wrappers | Done |
| `extension/src/content/strategies/HeuristicStrategy.js` | **Modified** — Pass 2 + captureUnknownAnswers | Done |
| `extension/src/content/index.js` | **Modified** — SAVE_ANSWERS handler | Done |
| `extension/src/App.jsx` | **Modified** — Save Answers button | Done |
| `extension/src/options/OptionsApp.jsx` | **Modified** — Saved Answers tab | Done |

**Files NOT modified**: GreenhouseStrategy.js (inherits from HeuristicStrategy), SmartMatcher.js (reused as-is), manifest.json (already has `storage` permission), backend/.

---

## UX Flow

1. User clicks **Scan** -> fields listed (including unknown questions like "sponsorship?")
2. User clicks **Autofill** -> known fields filled from profile, unknown fields filled from memory (if answers exist)
3. User manually answers remaining blank fields on the page
4. User clicks **Save Answers to Memory** -> unknown fields with values are captured and stored
5. Next application -> step 2 now also fills those remembered answers automatically

---

## Verification Checklist

- [ ] **Normalization**: `normalizeQuestion("Do you require visa sponsorship?")` -> `"require sponsorship visa"`
- [ ] **Learn + Recall**: Autofill a Greenhouse page -> manually fill "sponsorship" dropdown -> Save Answers -> different job page -> Autofill -> sponsorship auto-fills
- [ ] **Options page**: Extension options -> "Saved Answers" tab -> entries with question, answer, use count -> edit answer -> delete answer
- [ ] **Fuzzy recall**: Save for "Do you require visa sponsorship?" -> page asking "Will you require sponsorship to work?" -> fuzzy-match auto-fill
- [ ] **Build**: `npm run build` succeeds (VERIFIED)

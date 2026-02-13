# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Flow AI is a Chrome extension that automates job application form filling with AI assistance. It has two parts:
- **Chrome Extension** (`extension/`): React + Vite side panel UI with content scripts that detect and autofill form fields on job sites
- **Backend** (`backend/`): Express.js server providing resume parsing (pdf-parse) and AI text generation (OpenAI gpt-4-turbo-preview)

## Commands

### Extension (run from `extension/`)
```bash
npm run dev      # Vite dev server with HMR + CRX plugin
npm run build    # Production build to dist/
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Backend (run from `backend/`)
```bash
node server.js   # Starts Express on port 3000
```
Requires `OPENAI_API_KEY` in `backend/.env`.

No test suite exists yet. `tests/repro_greenhouse.html` is a manual HTML reproduction of a Greenhouse form for local testing.

## Architecture

### Strategy Pattern for Autofill

The core architecture uses a **Strategy pattern** for site-specific form filling:

1. **StrategyManager** (`extension/src/content/strategies/StrategyManager.js`) selects a strategy based on hostname
2. **Site-specific strategies** (Greenhouse, Google Forms, SmartRecruiters) handle ATS-specific DOM structures
3. **HeuristicStrategy** is the fallback — scans all inputs/textareas/selects and classifies fields via keyword matching in `heuristics.js`
4. All strategies extend **BaseStrategy** which defines the interface: `matches()`, `scan()`, `autofill()`, `getPageText()`

To add support for a new job site: create a strategy in `extension/src/content/strategies/`, extend `HeuristicStrategy`, implement `matches(hostname)`, override `autofill()`, and register it in `StrategyManager.js`.

### Content Script ↔ Side Panel Communication

The side panel (`App.jsx`) sends Chrome messages (`SCAN_PAGE`, `AUTOFILL`, `GET_PAGE_TEXT`) to the content script (`content/index.js`), which delegates to the active strategy.

### Field Detection

`heuristics.js` classifies form fields by checking element id, name, aria-label, placeholder, and associated label text against keyword mappings in `FIELD_MAPPINGS`. Returns `{ type, label }` for each field.

**SmartMatcher** (`extension/src/utils/SmartMatcher.js`) provides token-based fuzzy matching (Jaccard similarity) with synonym expansion for intelligent dropdown value selection. Used by GreenhouseStrategy for degree/school matching.

### React-Compatible Form Filling

Job sites built with React require a specific hack: use `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` to bypass React's synthetic event system, then dispatch `input`, `change`, and `blur` events. This pattern is in HeuristicStrategy's autofill methods.

### Data Flow

- **Storage**: Chrome local storage via `utils/storage.js` — stores `userProfile`, `education[]`, `experience[]`, `resume{}` (base64, max 4MB)
- **Supabase** (`utils/supabase.js`): Google OAuth and cross-device sync (application history)
- **Backend API** (`utils/api.js`): Hardcoded to `localhost:3000` — `/api/parse-resume` and `/api/generate-response`

### Extension Entry Points

- **Side Panel UI**: `extension/src/App.jsx` (Profile tab + Job Context tab with scan/autofill/AI)
- **Options Page**: `extension/src/options/OptionsApp.jsx` (full dashboard: Profile, Experience, Education, Resume, History)
- **Content Script**: `extension/src/content/index.js`
- **Manifest**: `extension/manifest.json` (Manifest V3)

## Tech Stack

- Extension: React 19, Vite 7 with @crxjs/vite-plugin, lucide-react icons, Supabase JS client
- Backend: Express 5, multer, pdf-parse, OpenAI SDK
- Pure JavaScript (no TypeScript)

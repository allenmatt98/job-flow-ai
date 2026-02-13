# Job Flow AI: Greenhouse Auto-Fill Enhancement Plan

## 1. Executive Summary
This document outlines the architecture and implementation strategy to upgrade Job Flow AI's auto-fill capabilities to match or exceed competitors like Simplify. The primary focus is on high-precision, robust filling of Greenhouse job applications, specifically targeting dynamic fields (Education/Experience), complex dropdowns, and persistent memory for user answers.

## 2. Current Limitations Analysis
Based on the review of `GreenhouseStrategy.js` and `SmartMatcher.js`:

| Limitation | Current Behavior | Problem |
| :--- | :--- | :--- |
| **Dynamic Fields** | Uses fixed `setTimeout` (1.5s) after clicking "Add Another". | Flaky on slow connections; fails if DOM updates take >1.5s. |
| **Dropdown Precision** | Attempts to force text value if no match found. | Invalid submission errors; frustration when dropdowns reject free text. |
| **Field Detection** | Relies on simple keyword matching (`heuristics.js`). | Misses context-specific fields (e.g., "University" in Education vs. "University" project). |
| **Memory** | No persistence of custom answers. | User must re-enter "Why do you want to work here?" every time. |
| **LLM Integration** | None. | Cannot handle complex/ambiguous questions or generative text. |

## 3. Core Architecture Enhancements

### 3.1. Event-Driven Dynamic Filling
Instead of `setTimeout`, we will use `MutationObserver` to detect DOM changes.
- **Pattern:** Click "Add Education" -> Observe container -> Wait for new `<input>` or `<select>` nodes -> Fill immediately.
- **Benefit:** 100% reliable, works as fast as the page loads.

### 3.2. "Strict Mode" Dropdown Engine
We will refactor `fillSmartDropdown` to prioritize accuracy over coverage.
1.  **Extract Options**: Get all valid `Select2` / `React-Select` / native `<option>` text.
2.  **Smart Match (Tier 1)**: Exact match or high-confidence substring match.
3.  **Fuzzy Match (Tier 2)**: Use `SmartMatcher` (Jaccard similarity) with strict threshold (e.g., > 0.8).
4.  **LLM Falback (Tier 3)**: If no match:
    - Send (Question, Options, User Value) to LLM.
    - Ask: "Which option matches?"
    - Example: User "B.Tech" -> Dropdown ["Bachelor of Technology", "B.E."]. LLM selects "Bachelor of Technology".
5.  **Failure State**: **Do not force text.** Leave blank and highlight for user review.

### 3.3. Centralized Memory (The "Brain")
We need a persistent store for user answers to Questions.
- **Key-Value Store**:
    - **Key**: Hash of (Question Text + Context + Type).
    - **Value**: User's previous answer.
    - **Metadata**: Date used, Company applied to.
- **Workflow**:
    1.  Detect Question: "Do you require sponsorship?"
    2.  Check Memory: Found "No" from previous application.
    3.  Auto-Fill "No".
    4.  If not found: Leave blank -> User fills "No" -> **Capture & Save on Submit**.

## 4. LLM Integration Strategy
The LLM will act as a reasoning engine, not just a text generator.

### 4.1. Use Cases
1.  **Generative Fields**: "Cover Letter", "Why us?".
    - *Action*: Generate unique text based on Company Name + User Resume + Job Description.
2.  **Ambiguous Mapping**:
    - *Question*: "Are you legally authorized to work in the US?"
    - *User Profile*: "Citizen".
    - *Dropdown*: ["Yes", "No", "Yes (requires sponsorship)"].
    - *LLM Decision*: "Yes" (Reasoning: Citizen implies authorization).
3.  **Data Extraction**: Parsing unstructured resume text into structured fields (e.g., extracting "GPA: 3.8" when requested).

## 5. Implementation Roadmap

### Phase 1: Robustness (No LLM yet)
- [ ] Refactor `GreenhouseStrategy.js` to use `MutationObserver` for adding sections.
- [ ] Implement strict dropdown logic (No force-fill).
- [ ] Improve `SmartMatcher` with more synonym data (Degrees, Universities).

### Phase 2: Memory Layer (Infrastructure Exists - Needs Wiring)
- [x] Create `StorageService` (`AnswerMemory.js` exists).
- [ ] **Wire up Recal**:
    -   `HeuristicStrategy` already acts as a base. ensure `GreenhouseStrategy` utilizes this for "Questions" sections.
    -   Add `recallAnswer` fallback to `fillDemographics` in `GreenhouseStrategy.js`.
- [ ] **Wire up Learn**:
    -   **Submit Listener**: In `GreenhouseStrategy`, attach a listener to `button[id*="submit"]` or `button:contains("Submit Application")`.
    -   **Action**: On click, call `this.captureUnknownAnswers()`, then `learnAnswers(entries)`.
    -   **Feedback**: potentially show a small toast "Answers saved to memory".

### Phase 5: UI Refinement & Interaction (Immediate Priority)

#### 1. Remove "Debug" Styles
-   **File**: `src/content/utils/FillFeedback.js`
-   **Change**: Remove `border` and `background` styles from `markField`.
-   **Retain**: `data-jfai-status` attribute (useful for internal logic, invisible to user).

#### 2. Floating Progress Widget
-   **New Component**: `src/content/ui/ProgressWidget.js`
    -   **UI**: fixed position (top-right), shadow-dom (to avoid CSS conflicts).
    -   **State**: `totalFields`, `filledFields`, `isPaused`.
    -   **Controls**: [Pause] / [Resume] buttons.

#### 3. Event-Driven Communication
-   **Pattern**: `Strategy` emits events -> `ContentScript` listens -> Updates `Widget`.
-   **Events**: `FIELD_FILLED`, `STRATEGY_PAUSED`, `STRATEGY_RESUMED`, `COMPLETED`.

#### 4. Pausable Strategy Logic
-   **File**: `src/content/strategies/HeuristicStrategy.js`
-   **New Method**: `async waitIfPaused()`
    -   Checks `this.isPaused`.
    -   If true, awaits a Promise that resolves only when `resume()` is called.
-   **Integration**: Add `await this.waitIfPaused()` before every `fillField` call in `GreenhouseStrategy` and `HeuristicStrategy`.

## 6. Verification & metrics
- **Success Rate**: % of fields filled without user correction.
- **Time to Fill**: Total time from page load to "Review".
- **Visual Feedback ("Polish")**:
    - [ ] **Remove Debug Borders**: The user wants an "authentic" feel. Remove colored borders.
    - [ ] **Progress Widget**: Floating box on top-right showing:
        - "Autofilling... (3/15 fields)"
        - [Pause] / [Resume] buttons.
        - [Stop] button.
    - [ ] **Pause Logic**: Strategies must check a `paused` flag before filling the next field.


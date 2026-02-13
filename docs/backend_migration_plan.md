# Backend Migration Plan: Job Flow AI Cloud

## 1. Product-Market Fit (PMF) Evaluation
**Objective**: Transition from a local-only extension to a cloud-synced productivity platform.

### Value Proposition
-   **"Write Once, Apply Everywhere"**: Sync your `AnswerMemory` across devices (laptop, desktop).
-   **Application History**: Users often forget where they applied. A dashboard showing "Applied to Google on Feb 14" is high value.
-   **Cover Letter Archive**: "What did I say to Stripe?" -> Retrieve old cover letters to iterate on new ones.
-   **Analytics**: "You've applied to 50 jobs this week." Gamification potential.

### Friction Analysis
-   **Google Sign-In**: Extremely low friction. Users are already in a "Job Seeking" mode using Gmail.
-   **Trust**: Users already trust Greenhouse/Lever with this data. Storing it in their own "Job Flow Dashboard" feels like a feature, not a privacy violation, *provided* we state we don't sell data.
-   **Verdict**: **Strong PMF**. This moves the product from a "tool" to a "platform".

---

## 2. Technical Architecture
**Stack**: **Supabase** (PostgreSQL + Auth) + **React** (Extension).
*Why Supabase?* You already have `@supabase/supabase-js` installed. It offers "Backend-as-a-Service" perfect for extensions, with built-in Google Auth and Row Level Security (RLS).

**Credentials** (for `src/config/supabase.js` or `.env`):
-   **Project URL**: `https://zrqsubrumqgefnkeiikx.supabase.co`
-   **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycXN1YnJ1bXFnZWZua2VpaWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzg1MTcsImV4cCI6MjA4NTg1NDUxN30.2bZK7Kl6Iy1VdiL9ossvbxUSFmMaP_UCtZEy-uHqaEE`

**Credentials** (for `src/config/supabase.js` or `.env`):
-   **Project URL**: `https://zrqsubrumqgefnkeiikx.supabase.co`
-   **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycXN1YnJ1bXFnZWZua2VpaWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzg1MTcsImV4cCI6MjA4NTg1NDUxN30.2bZK7Kl6Iy1VdiL9ossvbxUSFmMaP_UCtZEy-uHqaEE`

### Components
1.  **Auth**: Supabase Auth (Google OAuth).
2.  **Database**: PostgreSQL.
3.  **API**: Supabase Client (Direct DB access via RLS).
4.  **Frontend**:
    -   **Popup**: Quick status, Login/Logout.
    -   **Web Dashboard**: A full-page React app (hosted on Vercel or within the extension as a full-tab page) for history and analytics.

---

## 3. Data Model (Schema)

### `profiles` (extends Auth)
-   `id` (UUID, PK) -> links to `auth.users`
-   `setup_completed` (Boolean)
-   `preferences` (JSONB) -> Generic settings

### `applications`
*Record every "Submit" click.*
-   `id` (UUID, PK)
-   `user_id` (UUID, FK)
-   `company_name` (Text) -> "Airbnb"
-   `job_title` (Text) -> "Senior Software Engineer"
-   `job_url` (Text)
-   `platform` (Text) -> "greenhouse", "lever"
-   `status` (Enum) -> "applied", "interviewing", "offer", "rejected"
-   `applied_at` (Timestamp)

### `cover_letters`
*Versioned storage of generated content.*
-   `id` (UUID, PK)
-   `application_id` (UUID, FK)
-   `content` (Text)
-   `generated_by` (Text) -> "gpt-4", "manual"

### `answer_memory` (Cloud Sync)
*Syncs with local `AnswerMemory.js`.*
-   `user_id` (UUID, FK)
-   `question_hash` (Text)
-   `question_text` (Text)
-   `answer_value` (Text)
-   `use_count` (Int)
-   `last_used` (Timestamp)

---

## 4. Implementation Steps (Phased)

### Phase 3-A: Foundation (Auth & Schema)
1.  **Supabase Setup**:
    -   Create Project.
    -   Enable Google Auth Provider.
    -   Run SQL Migrations for tables.
2.  **Auth UI**:
    -   Create `Login.jsx` in Extension Popup.
    -   Implement "Sign in with Google".
3.  **Session Management**:
    -   Store JWT in `chrome.storage.session`.

### Phase 3-B: The "Recorder" (Sync)
1.  **Application Tracking**:
    -   Update `GreenhouseStrategy.addSubmitListener`.
    -   On submit -> Insert into `applications` table.
2.  **Memory Sync**:
    -   On `learnAnswers` -> Upsert to `answer_memory` table.
    -   On Startup -> Pull `answer_memory` from cloud to local.

### Phase 3-C: The Dashboard (User Interface)
1.  **Dashboard Page**:
    -   Create `src/dashboard/index.html`.
    -   Build a React Table showing Application History.
    -   "View Cover Letter" modal.
2.  **Edit Memory**:
    -   Allow users to delete/edit learned answers in the Dashboard.

## 5. UI/UX Vision
**Clean, Professional, Data-Rich.**
-   **Dashboard**: A table view similar to "Supabase Dashboard" in terms of look and feel. Minimal but from a UX stand point easy for the user to navigate and read Columns: Date, Company, Role, Status.
-   **Search**: "Filter by 'Google'" to see all applications to Google.
-   **Memory Bank**: A searchable list of "Questions we know how to answer". User can manually edit: "Do you need sponsorship?" -> "No".

---

## 6. Next Actions
-   [ ] **Approve Plan**: Does this align with your vision?
-   [ ] **Credentials**: I will need your Supabase Project URL and Anon Key (or I can set up a mock one for now).
-   [ ] **Start Phase 3-A**: Implement Auth.

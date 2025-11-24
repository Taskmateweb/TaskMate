Test Plan — TaskMate
=====================

Prepared for: TaskMate
Prepared by: Automation Team
Created: 2025-11-15

Overview
--------
This document defines the testing approach, scope, test cases and responsibilities for the TaskMate project. It covers feature-by-feature test scenarios, acceptance criteria, test data, environments and ownership. Tests include manual verification steps, integration checks and suggested automation targets.

Assigned Testers (randomly assigned)
------------------------------------
- Rakibul Islam
- Jannatunnesa Zinia
- Tanin Chowdhury
- Fahiya Jannat Proma
- Yashin Ahmed Nadim

Feature Assignments (random)
----------------------------
- Authentication & Authorization — Rakibul Islam
- Tasks (CRUD, lists, priorities, categories) — Jannatunnesa Zinia
- Focus Mode (timer, sessions, alarm, DB) — Tanin Chowdhury
- Reports & Analytics (charts, metrics, insights) — Fahiya Jannat Proma
- Calendar & Notifications (events, reminders, notifications panel) — Yashin Ahmed Nadim

Test Scope
----------
In-scope:
- Core functionality (tasks, focus, calendar, reports)
- Authentication and profile management
- Firestore reads/writes and security rules
- UI interactions and responsiveness for supported breakpoints
- Notification UI and logic

Out-of-scope (for now):
- Third-party integrations not yet added
- Load/performance beyond small scale (separate perf tests planned)

Environments
------------
- Local development (dev build)
- Staging Firebase project (recommended) — ensure `firestore.rules` deployed to staging
- Browsers: Chrome (latest), Firefox (latest), Edge (latest), Safari (latest macOS)
- Mobile: Chrome on Android, Safari on iOS (responsive checks)

Test Data & Accounts
--------------------
- Create test users with emails like `qa+rakibul@taskmate.test`, `qa+jannatunnesa@taskmate.test`, etc.
- Create tasks/events with distinct titles to isolate tests
- Use Firestore test dataset or a staging project; do not use production credentials

Test Types & Priority
---------------------
- Smoke tests: Critical flows (login, create task, start focus, finish focus)
- Functional tests: Feature-by-feature scenarios
- Integration tests: DB + UI interactions (saving sessions, reports generation)
- E2E (manual or automated): Multi-step flows (task -> focus -> report)
- Regression tests: After bug fixes

Feature Test Cases
------------------
(Each feature lists: Test Case ID, Objective, Steps, Expected Result, Priority)

1) Authentication & Authorization (Owner: Rakibul Islam)
------------------------------------------------------
Auth-01 — Login (Happy path)
- Steps: Open app -> Click Login -> Enter valid credentials -> Submit
- Expected: User is authenticated, redirected to `dashboard.html`, auth state persisted
- Priority: P0

Auth-02 — Logout
- Steps: Click profile -> Click Logout
- Expected: User is signed out and redirected to the index/login page
- Priority: P0

Auth-03 — Unauthorized access blocked
- Steps: While logged out try to access `focus.html` or `reports.html`
- Expected: Redirect to login page
- Priority: P1

Auth-04 — Profile read/write permissions
- Steps: Logged-in user opens profile page and updates bio, submits
- Expected: Profile document under `users/{uid}/profile/*` updated; no permission errors
- Priority: P1

Notes:
- Validate that Firestore rules allow only the owning user to read/write their profile and resources.

2) Tasks (Owner: Jannatunnesa Zinia)
------------------------------------
TASK-01 — Create Task
- Steps: Dashboard -> New Task -> Set title, priority, category -> Save
- Expected: Task appears in list, Firestore `tasks` doc created with `userId` field = current user
- Priority: P0

TASK-02 — Edit Task
- Steps: Open a task -> Edit fields -> Save
- Expected: UI and DB reflect updated values
- Priority: P1

TASK-03 — Delete Task
- Steps: Delete a task -> Confirm
- Expected: Task removed from UI and DB
- Priority: P1

TASK-04 — Mark Complete & Undo
- Steps: Complete a task -> Verify completed state -> Undo
- Expected: Status toggles correctly and is reflected in reports
- Priority: P1

TASK-05 — Filters, Sorting and Searching
- Steps: Use filters (priority, category), search for a task
- Expected: List updates correctly
- Priority: P2

3) Focus Mode (Owner: Tanin Chowdhury)
--------------------------------------
FOCUS-01 — Start a Focus Session
- Steps: Open `focus.html` -> Select an undone task -> Set time -> Start
- Expected: Timer runs, UI updates (pause/resume/stop), session tracked in memory
- Priority: P0

FOCUS-02 — Complete a Session and Save
- Steps: Let timer complete or stop and complete -> Confirm save
- Expected: Focus session saved to `focusSessions` collection with fields: `userId`, `taskId`, `taskTitle`, `duration` (minutes), `completedAt` (Timestamp), `status`="completed"; congrats modal shown and 5s alarm plays
- Priority: P0

FOCUS-03 — Pause/Resume/Stop
- Steps: Start -> Pause -> Resume -> Stop
- Expected: Timer pauses/resumes correctly; stopping prompts confirmation and behaves correctly
- Priority: P1

FOCUS-04 — Activity & Stats Sidebar
- Steps: Complete several sessions -> Open activity sidebar
- Expected: Today’s totals and counts reflect completed sessions
- Priority: P1

FOCUS-05 — Recent Sessions and DB consistency
- Steps: Complete sessions -> Open Recent Sessions list
- Expected: Shows last N sessions (default 10), includes `taskTitle` and `duration`
- Priority: P1

4) Reports & Analytics (Owner: Fahiya Jannat Proma)
---------------------------------------------------
REPORT-01 — Load Reports (Happy path)
- Steps: Login -> Open `reports.html`
- Expected: Reports load, charts render, stat cards show non-zero where applicable
- Priority: P0

REPORT-02 — Date Range Switching
- Steps: Switch between Today/Week/Month/Year/All
- Expected: Data and charts update correctly
- Priority: P1

REPORT-03 — Consistency with DB
- Steps: Create tasks and focus sessions in DB for the period -> Refresh reports
- Expected: Stats reflect DB contents (counts, durations, rates)
- Priority: P1

REPORT-04 — Recent Activity and Insights
- Steps: Generate multiple events/tasks -> Open insights
- Expected: Insights generate appropriate suggestion messages
- Priority: P2

5) Calendar & Notifications (Owner: Yashin Ahmed Nadim)
------------------------------------------------------
CAL-01 — Create Event
- Steps: Open calendar -> Add event for today/tomorrow -> Save
- Expected: Event appears on calendar and in `users/{uid}/events` subcollection
- Priority: P0

CAL-02 — Edit/Delete Event
- Steps: Click event -> Edit fields -> Save / Delete
- Expected: DB and UI reflect the change
- Priority: P1

CAL-03 — Notifications for Upcoming Events
- Steps: Create event for today/tomorrow -> Open calendar -> Click bell icon
- Expected: Notification shows the event; badge appears on bell; clicking opens panel
- Priority: P0

CAL-04 — Reminders & Timezones
- Steps: Create events with timezone-critical times; verify display in local timezone
- Expected: Event times display correctly for the user’s timezone
- Priority: P2

6) Profile & Settings
---------------------
PROFILE-01 — View Profile
- Steps: Open profile page
- Expected: All fields populate from Firestore and user auth profile
- Priority: P1

PROFILE-02 — Update Preferences
- Steps: Change preferences (theme, notifications) -> Save
- Expected: Preferences saved to Firestore `users/{uid}/profile/preferences` and apply in UI
- Priority: P1

7) Security Rules Verification (cross-feature)
----------------------------------------------
SEC-01 — Ensure rules prevent cross-user access
- Steps: Using two accounts, attempt to read/write another user's tasks/profile
- Expected: Access denied by Firestore rules
- Priority: P0

SEC-02 — Verify write protections (server-enforced fields)
- Steps: Try to set `completedAt` or `userId` to another user via client
- Expected: Rules prevent illegal write (where enforced)
- Priority: P0

8) Usability, Accessibility & Responsiveness
-------------------------------------------
- Verify keyboard navigation, ARIA labels, color contrast and font scaling
- Test responsive layouts on 320px, 768px and 1280px widths
- Confirm modals and dialogs are accessible and focus-trapped

Regression & Automation Targets
-------------------------------
- Automate smoke tests for login, task create/edit/delete, start & complete focus session, and calendar event add/delete.
- Add integration tests for reports data generation (mock DB or staging project)

Defect Logging & Triage
-----------------------
- Use the project issue tracker (GitHub Issues/Jira)
- Priority/Severity mapping: P0 (blocker), P1 (major), P2 (minor)
- Provide steps to reproduce, expected vs actual, logs and screenshots

Sign-off Criteria
-----------------
- All P0 tests pass
- No open P0 defects
- P1 defects either fixed or have mitigation documented
- Product owner approval

Appendix — Quick Test Checklist (smoke)
--------------------------------------
- [ ] Login/Logout
- [ ] Create/Edit/Delete Task
- [ ] Start/Complete Focus session (alarm audible for 5s)
- [ ] Create Calendar Event -> see in notifications
- [ ] Open Reports -> see non-zero metrics when test data exists


Contact & Notes
---------------
For help with environment setup, data seeding, or running automation, contact the tech lead or reviewer.


--- End of Test Plan ---

# GAP-R03: Course-Based Firing (Multi-Course Meal Management)

**Status:** Phase 1 COMPLETE
**Priority:** 2
**Square Reference:** Assign items to courses (appetizer, entree, dessert). KDS fires courses sequentially. Server controls "Fire Next Course" from POS. Two KDS display modes: show all courses or only fired.

---

## Overview

Full-service restaurants need to pace multi-course meals. Servers assign items to courses at the POS, then fire each course to the kitchen when the table is ready. KDS groups items by course and only shows the currently fired course as active. Course timing is configurable per restaurant.

---

## Phase 1 — Course Assignment & Firing (Steps 1-5)

### Step 1: Course Models

**Files to modify:**
- `src/app/models/order.model.ts` — add `courseNumber: number | null` to `Selection`. Add `CourseStatus` type (`'hold' | 'fired' | 'completed'`). Add `CourseInfo` interface (courseNumber, name, status, firedAt, completedAt). Add `courses: CourseInfo[]` to `Check`.
- `src/app/models/settings.model.ts` — add `CourseTimingSettings` interface (enableCoursing: boolean, defaultCourseNames: string[] (default: ['Appetizer', 'Entree', 'Dessert']), autoFireFirstCourse: boolean, courseFiringDelay: number (minutes between auto-fire suggestions)).

### Step 2: Service Methods

**Files to modify:**
- `src/app/services/order.ts` — add `assignCourse(orderId, checkId, selectionIds, courseNumber)`, `fireCourse(orderId, checkId, courseNumber)`, `holdCourse(orderId, checkId, courseNumber)`, `fireAllCourses(orderId, checkId)`. Socket events: `course:fired`, `course:held`.
- `src/app/services/restaurant-settings.ts` — `saveCourseTimingSettings()`, `_courseTimingSettings` signal.

### Step 3: POS Course Assignment UI

Add course assignment to ServerPosTerminal when adding items to a check.

**Files to modify:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` — `courseTimingEnabled` computed from settings. Course selector dropdown/chips when adding items. `assignItemsToCourse()` method. Course grouping in check view with collapsible sections. "Fire" and "Hold" buttons per course section.
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.html` — course chips in check panel (Appetizer / Entree / Dessert / +Custom). Fire/Hold toggle per course. Course status badges (Hold=gray, Fired=green, Completed=blue).
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss` — course section styles, fire/hold button states.

### Step 4: KDS Course Display

KDS groups items by course and highlights the currently active (fired) course.

**Files to modify:**
- `src/app/features/kds/order-card/order-card.ts` — `courseGroups` computed that groups selections by courseNumber. `activeCourse` computed (lowest courseNumber with status 'fired'). Course header display with name and status.
- `src/app/features/kds/order-card/order-card.html` — course group sections with header (course name, status badge). Fired course items shown fully; held course items shown dimmed/collapsed. "View All Courses" toggle button.
- `src/app/features/kds/order-card/order-card.scss` — course header styles, held/fired visual states.
- `src/app/features/kds/kds-display/kds-display.ts` — `courseViewMode` signal ('fired_only' | 'all_courses'). Filter logic: when 'fired_only', only show orders with at least one fired course, and within those orders only show fired items.
- `src/app/features/kds/kds-display/kds-display.html` — course view mode toggle button in KDS header.

### Step 5: Course Settings UI

**Files to modify:**
- `src/app/features/settings/control-panel/` or relevant settings component — course timing configuration section: enable/disable coursing toggle, default course names (editable list with add/remove), auto-fire first course toggle, inter-course timing suggestion.

---

## Phase 2 — Advanced Course Features (Steps 6-9)

### Step 6: Course Timing Suggestions

Visual timer between courses. After completing one course, a countdown shows recommended time before firing next course (configurable per restaurant).

### Step 7: Fire Notification to Server

Socket.io event when all items in a course are completed on KDS. POS shows toast: "Table 5 — Appetizer course complete. Fire entrees?"

### Step 8: Course Templates

Pre-configured course structures for common meal types (3-course dinner, 5-course tasting menu, brunch 2-course). Apply template to check to auto-create course slots.

### Step 9: Build Verification

- `ng build --configuration=production` — zero errors
- Verify course assignment in POS
- Verify KDS course grouping and filtering
- Verify fire/hold Socket.io round-trip

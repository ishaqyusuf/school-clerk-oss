# ADR-0066: Shared responsive calendar inputs

- Date: 2026-10-05
- Status: Implemented and verified locally

## Decision

`@school-clerk/ui/calendar-popover` owns calendar presentation: installed shadcn Drawer below 768 px, Popover on desktop. It accepts a trigger, accessible title/description, calendar content and optional controlled open state. FormDate, AttendanceDatePicker, DateRangePicker and date-filter menus reuse it. Per-form mobile opt-in is removed.

Shared Input delegates `type="date"` to CalendarInput, preserving the real native input, forwarded ref, name, required/min/max, disabled/readOnly and controlled/uncontrolled values. On mobile, click/keyboard opens the shared sheet and selection dispatches ordinary input/change events through the native value setter. Desktop native inputs retain native behavior. Disabled/readOnly inputs cannot select a new date. Caller-native constraints map to calendar bounds.

Mobile calendars use available width with approximately 40–48 px day cells, tight week spacing and reduced header/footer padding. Accessible descriptions remain available without redundant visible instructions. Content scrolls for short screens; the footer and safe-area padding remain available. DateRangePicker shows one month on mobile and two on desktop. Existing selection/validation and financial/academic policies are unchanged.

## Validation

Authenticated Daarul Hadith QA verified student and attendance mobile sheets; controlled native selection changed the React value from 2026-10-05 to 2026-10-06; range selection retained October 5–9 and rendered one month at 390 px without overflow. Calendar itself fits 320 px (288 px calendar); an existing background URL-variants control overflows at that width outside the calendar. Desktop attendance uses Popover at 1280 px. Temporary test route/tab removed; no persisted school data changed in this follow-up. Fourteen focused attendance/date-filter tests and narrow frontend compilation pass. Broad dashboard typecheck has no new diagnostic categories compared with the existing baseline, but remains blocked by shared Prisma/React typing errors.

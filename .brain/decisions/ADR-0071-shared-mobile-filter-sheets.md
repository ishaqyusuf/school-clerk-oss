# ADR-0071: Shared mobile filter sheets

- Date: 2026-10-06
- Status: Implemented; locally verified with recorded coverage limits

## Decision

Use approved Expandable groups workshop option 02 for existing list filters below
768px. One shared UI package component owns a bottom sheet, one-open accordion,
summary labels and a draft/Apply/Reset lifecycle. Keep desktop controls and domain
setters. Adapt both shared SearchFilter implementations and standalone local or
URL-backed filter controls to this interface. Avoid creating an empty filter entry
point for search-only forms.

This is a deliberate bounded bottom-sheet choice for transient list filtering,
consistent with SchoolClerk's responsive calendar decision (ADR-0066). It is not a
new fullscreen page, record editor or change to general dialog policy. The Midday
state/feature-flow guidance is applied by retaining domain state ownership,
query schemas and package boundaries; draft state belongs to the presentation
session and only Apply crosses that boundary.

## Consequences

Metadata and permissions remain consumer-owned; the component accepts permitted
options rather than discovering or granting scope. Dynamic groups and pure option
patch callbacks preserve student dependencies without URL writes during editing.
Apply sends only group keys, avoiding stale search/sort/pagination overwrites.
Reset restores a group's existing mandatory default when configured. Desktop
continues applying each selection immediately. Search-only headers and workflow
scope/record pickers keep their existing behavior.

Radix Sheet/Dialog primitives supply modal accessibility and scroll locking. A
filter-local content wrapper uses a higher layer than the dashboard's development
URL widget, with reduced-motion treatment on both overlay and content. Standard
shadcn primitives remain unchanged. Date serialization/control is shared so the
UI package and app do not fork URL date semantics.

## Validation

Seventeen focused tests pass; new shared files and the rewritten legacy wrapper
pass focused Biome checks. Authenticated student mobile/desktop, staff and classroom
flows and a temporary real-component fixture were exercised. Student sheets fit
320px/390px; custom date range and linked session/term drafts apply correctly;
focus loop, return, lock, Reset, Close, backdrop and Escape were checked. Fixture
checks cover assignee multi-select, long-list search, loading, empty and Retry.
The fixture route was removed and viewport restored. Finance is disabled in the
local tenant, so its adapters have source verification only. Broad typecheck still
fails on existing diagnostics. Full audit and limitations are in the task record.

# Classroom overview sheet v2 workshop (2026-10-12)

Three simple, clean directions for `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`. Each one covers every feature in [FEATURES.md](FEATURES.md).

- **01 Quiet toolbar**: keeps today's tabs. Every section follows the same rhythm: one summary line, one toolbar, one list. Detail panels open beside the list.
- **02 Section rail**: sections sit in a side rail, each with one live number. Details open in place with a breadcrumb, and the sheet never widens.
- **03 Class register**: one register where today's attendance and balances sit on each row. Subjects and Records are the only other views.

Open `index.html`. To serve it, use launch config `classroom-sheet-v2-workshop` (port 4472) or run `python3 -m http.server 4472 --directory artifacts/classroom-sheet-v2-workshop`. Each direction has these controls:

- **Desktop/Phone**: switches the viewport.
- **Viewing as**: switches the role (Admin, Registrar or Teacher).
- **Theme**: switches between light and dark.
- **Coverage**: shows where each FEATURES.md ID lives in that direction.
- **Reset**: restores the starting state.

All data is fictional. There are no network calls or real actions.

The brief for the builders is in [BRIEF.md](BRIEF.md). Shared tokens are the current product tokens.

Verification on 2026-10-12:
- `node --check` passes for all three directions.
- The pages were opened in the in-app browser at desktop and phone sizes. The checks covered:
  - fresh loads with no console errors;
  - the 02 attendance recorder;
  - the 01 side-by-side student panel;
  - the 03 attendance mode (Mark rest, then Save, then the register updates);
  - the 03 dark phone layout;
  - the gallery.
- Builders also ran scripted DOM smoke tests of their main flows.

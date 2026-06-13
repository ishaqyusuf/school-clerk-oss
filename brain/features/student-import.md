# Feature: Student Import

## Purpose

Allow school operators to import multiple students at once in a streamlined workflow, ensuring proper classroom assignment, name parsing, and gender handling.

## User Flow

1. **Upload / Start Screen**:
   - Select **Target Classroom** (department) from the active academic session.
   - (Optional) Select **Global Gender** to serve as a default fallback.
   - Paste student records into the textarea (one student per line).
   - Preview parsed rows count and see validation warnings.
2. **Verification & Matching**:
   - The parsed batch is verified against existing records to detect conflicts, duplicates, or suspected typo matches.
3. **Review & Resolution**:
   - The user resolves any warnings or conflicts before executing the import.

## Input Parsing Contract

Each pasted line is parsed as follows:
- The line is split by the first comma `,` into a **Name Part** and an optional **Gender Part**.
- The **Name Part** is trimmed and split by whitespace into tokens:
  - Token 1: `name` (First name)
  - Token 2: `surname` (Family name)
  - Remaining Tokens: `otherName` (Middle or additional names)
- The **Gender Part** is matched against recognized aliases:
  - Male aliases: `Male`, `M`, `male`, `m`
  - Female aliases: `Female`, `F`, `female`, `f`
- **Gender Assignment Priority & Schema**:
  1. Explicit row-level gender (specified on the line, stored as `parsedGender` internally).
  2. Selected Global Gender (if no row-level gender is specified).
  3. Left as *missing* (to be inferred or resolved later) if neither is provided. No silent defaults are applied.
  
  **Note on Schema Identity:** In the parsed output payload, `student.gender` acts as the canonical *effective input gender*, representing the final resolved intent (row-level fallback to global), while `student.parsedGender` retains strictly what was explicitly found on the individual line.

## UI Validation & Warnings

- If a line is empty or has a missing name part, it is flagged with a warning.
- If a line is missing a family name (surname), a warning is displayed.
- If a gender alias is unrecognized, a warning is displayed.
- Warnings include line numbers to help operators locate and edit problematic entries directly in the paste area.
- Proceeding to the verification tab requires a valid classroom selection.

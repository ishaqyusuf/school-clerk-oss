/** `error` is null when the input is acceptable; `value` is null for an empty cell. */
export type ScoreInputResult = { value: number | null; error: string | null };

/**
 * Client-side mirror of the score-entry rule: empty means no score, otherwise a finite
 * non-negative number that does not exceed a numeric `obtainable`. `null` obtainable is uncapped.
 */
export function parseScoreInput(
	raw: string,
	obtainable: number | null | undefined,
): ScoreInputResult {
	const value = raw.trim();
	if (value === "") return { value: null, error: null };

	const score = Number(value);
	if (!Number.isFinite(score) || score < 0) {
		return { value: null, error: "Enter a number of 0 or more" };
	}
	if (obtainable != null && score > obtainable) {
		return { value: null, error: `Maximum is ${obtainable}` };
	}
	return { value: score, error: null };
}

export type ScoreGridMove = { rows: number; cols: number };

/** Maps a score-cell key press to a grid move. Tab is left to the browser's own order. */
export function getScoreGridMove(
	key: string,
	shiftKey: boolean,
): ScoreGridMove | null {
	switch (key) {
		case "Enter":
			return { rows: shiftKey ? -1 : 1, cols: 0 };
		case "ArrowDown":
			return { rows: 1, cols: 0 };
		case "ArrowUp":
			return { rows: -1, cols: 0 };
		default:
			return null;
	}
}

/**
 * Focuses the score cell `move` away from `from` inside the same table. Cells opt in with
 * `data-score-row` / `data-score-col`. Returns false at the grid edge.
 */
export function focusScoreCell(from: HTMLElement, move: ScoreGridMove) {
	const origin = from.closest<HTMLElement>("[data-score-row]");
	const table = from.closest("table");
	if (!origin || !table) return false;

	const row = Number(origin.dataset.scoreRow) + move.rows;
	const col = Number(origin.dataset.scoreCol) + move.cols;
	const target = table.querySelector<HTMLElement>(
		`[data-score-row="${row}"][data-score-col="${col}"]`,
	);
	if (!target) return false;

	target.focus();
	target.scrollIntoView({ block: "nearest", inline: "nearest" });
	return true;
}

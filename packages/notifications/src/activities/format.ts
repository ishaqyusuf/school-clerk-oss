const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Money in major units. Whole amounts drop the kobo. */
export function formatActivityAmount(amount: number, currency?: string | null) {
	const fractionDigits = Number.isInteger(amount) ? 0 : 2;
	const code = currency?.trim().toUpperCase() || "NGN";
	try {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: code,
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits,
		}).format(amount);
	} catch {
		return `${code} ${amount.toLocaleString("en-US")}`;
	}
}

function splitDay(day: string) {
	const [year, month, date] = day.split("-").map(Number);
	if (!year || !month || !date || month > 12) return null;
	return { year, month, date };
}

/** `2026-11-13` → `13 Nov`. Parsed by parts so time zones never shift it. */
export function formatShortDay(day: string) {
	const parts = splitDay(day);
	return parts ? `${parts.date} ${MONTHS[parts.month - 1]}` : day;
}

/** `2026-11-13` → `Fri, 13 Nov 2026`. */
export function formatLongDay(day: string) {
	const parts = splitDay(day);
	if (!parts) return day;
	const weekday =
		WEEKDAYS[
			new Date(Date.UTC(parts.year, parts.month - 1, parts.date)).getUTCDay()
		];
	return `${weekday}, ${parts.date} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function formatCount(
	value: number,
	singular: string,
	plural = `${singular}s`,
) {
	return `${value.toLocaleString("en-US")} ${value === 1 ? singular : plural}`;
}

export function formatNumber(value: number) {
	return value.toLocaleString("en-US");
}

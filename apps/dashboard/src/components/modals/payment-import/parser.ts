import Papa from "papaparse";

export type PaymentImportMode = "STUDENT" | "STAFF";
export type PaymentImportType =
	| "SCHOOL_FEE"
	| "ENTRANCE_FORM"
	| "BOOK"
	| "UNIFORM"
	| "WAGE";

export type ParsedPaymentImportRow = {
	lineNumber: number;
	paymentDate: string | null;
	counterpartyName: string;
	paymentType: PaymentImportType;
	amount: number;
	sourceNote: string | null;
	counterpartyId: string | null;
	streamId: string | null;
	itemId: string | null;
	allowDuplicate: boolean;
	skip: boolean;
};

export type PaymentImportParseResult = {
	rows: ParsedPaymentImportRow[];
	errors: Array<{ lineNumber: number | null; message: string }>;
};

const TYPE_ALIASES: Record<string, PaymentImportType> = {
	school_fee: "SCHOOL_FEE",
	"school fee": "SCHOOL_FEE",
	fees: "SCHOOL_FEE",
	fee: "SCHOOL_FEE",
	tuition: "SCHOOL_FEE",
	madrasah_fee: "SCHOOL_FEE",
	entrance_form: "ENTRANCE_FORM",
	"entrance form": "ENTRANCE_FORM",
	admission_form: "ENTRANCE_FORM",
	"admission form": "ENTRANCE_FORM",
	form: "ENTRANCE_FORM",
	book: "BOOK",
	books: "BOOK",
	uniform: "UNIFORM",
	"school uniform": "UNIFORM",
	wage: "WAGE",
	wages: "WAGE",
	salary: "WAGE",
};

function normalizeHeader(header: string) {
	return header
		.replace(/^\uFEFF/, "")
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");
}

function normalizePaymentType(value: string) {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");
	return TYPE_ALIASES[normalized] ?? TYPE_ALIASES[value.trim().toLowerCase()];
}

function parseAmount(value: string) {
	const normalized = value.replace(/[₦,\s]/g, "").trim();
	if (!normalized) return null;
	const amount = Number(normalized);
	return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function isExactDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T12:00:00.000Z`);
	return (
		!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
	);
}

export function parsePaymentImportCsv(
	source: string,
	mode: PaymentImportMode,
): PaymentImportParseResult {
	const errors: PaymentImportParseResult["errors"] = [];
	const expectedNameHeader = mode === "STUDENT" ? "student_name" : "staff_name";
	const parsed = Papa.parse<Record<string, string>>(source, {
		header: true,
		skipEmptyLines: "greedy",
		transformHeader: normalizeHeader,
	});
	const headers = parsed.meta.fields ?? [];
	const requiredHeaders = [
		"date",
		expectedNameHeader,
		"payment_type",
		"amount",
	];
	const allowedHeaders = new Set([...requiredHeaders, "source_note"]);

	for (const header of requiredHeaders) {
		if (!headers.includes(header)) {
			errors.push({
				lineNumber: null,
				message: `Missing required column: ${header}.`,
			});
		}
	}
	for (const header of headers) {
		if (!allowedHeaders.has(header)) {
			errors.push({
				lineNumber: null,
				message: `Unsupported column: ${header}.`,
			});
		}
	}

	for (const error of parsed.errors) {
		errors.push({
			lineNumber: typeof error.row === "number" ? error.row + 2 : null,
			message: error.message,
		});
	}

	if (errors.some((error) => error.lineNumber == null)) {
		return { rows: [], errors };
	}

	const rows: ParsedPaymentImportRow[] = [];
	parsed.data.forEach((record, index) => {
		const lineNumber = index + 2;
		const rawDate = record.date?.trim() ?? "";
		const counterpartyName = record[expectedNameHeader]?.trim() ?? "";
		const paymentType = normalizePaymentType(record.payment_type ?? "");
		const amount = parseAmount(record.amount ?? "");
		const rowErrors: string[] = [];

		if (rawDate && !isExactDate(rawDate)) {
			rowErrors.push("Date must use YYYY-MM-DD.");
		}
		if (!counterpartyName) rowErrors.push("Name is required.");
		if (!paymentType) rowErrors.push("Payment type is not supported.");
		if (mode === "STUDENT" && paymentType === "WAGE") {
			rowErrors.push("WAGE belongs in a staff payment import.");
		}
		if (mode === "STAFF" && paymentType && paymentType !== "WAGE") {
			rowErrors.push("Staff imports only support WAGE.");
		}
		if (amount == null) rowErrors.push("Amount must be greater than zero.");

		if (rowErrors.length) {
			for (const message of rowErrors) errors.push({ lineNumber, message });
			return;
		}
		if (!paymentType || amount == null) return;

		rows.push({
			lineNumber,
			paymentDate: rawDate || null,
			counterpartyName,
			paymentType,
			amount,
			sourceNote: record.source_note?.trim() || null,
			counterpartyId: null,
			streamId: null,
			itemId: null,
			allowDuplicate: false,
			skip: false,
		});
	});

	return { rows, errors };
}

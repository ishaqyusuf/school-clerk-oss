import { z } from "zod";

export const INSTITUTION_TYPES = [
	"PRESCHOOL",
	"PRIMARY",
	"SECONDARY",
	"K12",
	"COLLEGE",
	"POLYTECHNIC",
	"UNIVERSITY",
	"TRAINING_CENTER",
	"RELIGIOUS_SCHOOL",
] as const;

export const institutionTypeSchema = z.enum(INSTITUTION_TYPES);
export type InstitutionType = z.infer<typeof institutionTypeSchema>;

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
	PRESCHOOL: "Preschool",
	PRIMARY: "Primary school",
	SECONDARY: "Secondary school",
	K12: "K–12 school (combined)",
	COLLEGE: "College",
	POLYTECHNIC: "Polytechnic",
	UNIVERSITY: "University",
	TRAINING_CENTER: "Training center",
	RELIGIOUS_SCHOOL: "Religious school",
};

export const institutionSettingsSchema = z.object({
	institutionType: institutionTypeSchema,
}).strict();

// Read compatibility only. New writes must use institutionTypeSchema so typos
// cannot silently become a default classification.
export function normalizeInstitutionType(value?: string | null): InstitutionType | null {
	const normalized = value?.trim().toUpperCase();
	const canonical = institutionTypeSchema.safeParse(normalized);
	if (canonical.success) return canonical.data;
	if (normalized === "K-12") return "K12";
	if (normalized === "VOCATIONAL") return "TRAINING_CENTER";
	return null;
}

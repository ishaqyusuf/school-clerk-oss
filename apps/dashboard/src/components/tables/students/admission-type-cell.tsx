import { Badge } from "@school-clerk/ui/badge";

type AdmissionType = "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";

export function AdmissionTypeCell({
	admissionType,
}: {
	admissionType: AdmissionType;
}) {
	const label =
		admissionType === "NEW_ADMISSION"
			? "New admission"
			: admissionType === "RETURNING"
				? "Returning"
				: "Needs classification";
	return (
		<Badge
			variant={admissionType === "NEW_ADMISSION" ? "success" : "outline"}
			className="rounded-none"
		>
			{label}
		</Badge>
	);
}

"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import {
	MobileActionSheet,
	MobileActionSheetItem,
	MobileActionSheetSeparator,
} from "@school-clerk/ui/custom/mobile-action-sheet";
import {
	ExternalLink,
	FileSpreadsheet,
	Link2,
	PanelRightOpen,
	Pencil,
	UserPlus,
	Users,
} from "lucide-react";
import type { RefObject } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	triggerRef?: RefObject<HTMLButtonElement | null>;
	/** Title of the single selected subject; hides "Edit assessments" when null. */
	subjectTitle?: string | null;
	onEditAssessments: () => void;
	onAddStudent: () => void;
	/** Opens the batch import form with this classroom preselected. */
	onBatchAddStudents: () => void;
	onOpenWorkbooks: () => void;
	onOpenPublicLink: () => void;
	publicLinkDisabled?: boolean;
	reportSheetHref?: string | null;
	onOpenClassroomOverview?: () => void;
};

/** Phone counterpart of the recording page's "More actions" dropdown. */
export function RecordingActionsSheet({
	open,
	onOpenChange,
	triggerRef,
	subjectTitle,
	onEditAssessments,
	onAddStudent,
	onBatchAddStudents,
	onOpenWorkbooks,
	onOpenPublicLink,
	publicLinkDisabled,
	reportSheetHref,
	onOpenClassroomOverview,
}: Props) {
	return (
		<MobileActionSheet
			open={open}
			onOpenChange={onOpenChange}
			triggerRef={triggerRef}
			title="Actions"
		>
			{subjectTitle ? (
				<MobileActionSheetItem
					icon={<Pencil />}
					description={<span dir="auto">{subjectTitle}</span>}
					onSelect={onEditAssessments}
				>
					Edit assessments
				</MobileActionSheetItem>
			) : null}
			<MobileActionSheetItem icon={<UserPlus />} onSelect={onAddStudent}>
				Add student
			</MobileActionSheetItem>
			<MobileActionSheetItem
				icon={<Users />}
				description="Paste a list of names for this class"
				onSelect={onBatchAddStudents}
			>
				Add students in batch
			</MobileActionSheetItem>
			<MobileActionSheetItem
				icon={<FileSpreadsheet />}
				onSelect={onOpenWorkbooks}
			>
				Assessment workbooks
			</MobileActionSheetItem>
			<MobileActionSheetItem
				icon={<Link2 />}
				disabled={publicLinkDisabled}
				onSelect={onOpenPublicLink}
			>
				Public recording link
			</MobileActionSheetItem>
			{reportSheetHref || onOpenClassroomOverview ? (
				<MobileActionSheetSeparator />
			) : null}
			{reportSheetHref ? (
				<MobileActionSheetItem asChild>
					<Link href={reportSheetHref} target="_blank">
						<ExternalLink aria-hidden="true" />
						<span className="min-w-0 flex-1 truncate">Report sheet</span>
					</Link>
				</MobileActionSheetItem>
			) : null}
			{onOpenClassroomOverview ? (
				<MobileActionSheetItem
					icon={<PanelRightOpen />}
					onSelect={onOpenClassroomOverview}
				>
					Classroom overview
				</MobileActionSheetItem>
			) : null}
		</MobileActionSheet>
	);
}

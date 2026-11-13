"use client";

import type { ActivityCategory } from "@school-clerk/utils/activity";
import { cn } from "@school-clerk/ui/cn";
import {
	Activity,
	ArrowRightLeft,
	Ban,
	Banknote,
	Bot,
	CalendarCheck,
	CalendarOff,
	CalendarPlus,
	CalendarX,
	ClipboardCheck,
	ClipboardPen,
	ClipboardX,
	Download,
	FileCheck,
	FilePlus,
	FileSpreadsheet,
	FileX,
	GraduationCap,
	Link,
	Link2Off,
	ListChecks,
	type LucideIcon,
	PenLine,
	Receipt,
	RefreshCw,
	Settings2,
	Sparkles,
	TriangleAlert,
	Undo2,
	Upload,
	UserCheck,
	UserMinus,
	UserPlus,
	UserRoundCheck,
	UserX,
	Wallet,
} from "lucide-react";

/** Registry icon names (kebab-case lucide) used by activity types. */
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
	"arrow-right-left": ArrowRightLeft,
	ban: Ban,
	banknote: Banknote,
	bot: Bot,
	"calendar-check": CalendarCheck,
	"calendar-off": CalendarOff,
	"calendar-plus": CalendarPlus,
	"calendar-x": CalendarX,
	"clipboard-check": ClipboardCheck,
	"clipboard-pen": ClipboardPen,
	"clipboard-x": ClipboardX,
	download: Download,
	"file-check": FileCheck,
	"file-plus": FilePlus,
	"file-spreadsheet": FileSpreadsheet,
	"file-x": FileX,
	"graduation-cap": GraduationCap,
	link: Link,
	"link-2-off": Link2Off,
	"list-checks": ListChecks,
	"pen-line": PenLine,
	receipt: Receipt,
	"refresh-cw": RefreshCw,
	sparkles: Sparkles,
	"triangle-alert": TriangleAlert,
	"undo-2": Undo2,
	upload: Upload,
	"user-check": UserCheck,
	"user-minus": UserMinus,
	"user-plus": UserPlus,
	"user-round-check": UserRoundCheck,
	"user-x": UserX,
	wallet: Wallet,
};

export function ActivityIcon({
	name,
	className,
}: {
	name: string | null | undefined;
	className?: string;
}) {
	const Icon = (name && ACTIVITY_ICONS[name]) || Activity;
	return <Icon aria-hidden className={cn("size-3.5", className)} />;
}

/** Category colour, used for the icon chip and the filter dots. */
export const ACTIVITY_CATEGORY_STYLES: Record<
	ActivityCategory,
	{ text: string; chip: string; dot: string }
> = {
	attendance: {
		text: "text-teal-700 dark:text-teal-400",
		chip: "bg-teal-600/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
		dot: "bg-teal-600 dark:bg-teal-400",
	},
	students: {
		text: "text-indigo-600 dark:text-indigo-300",
		chip: "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
		dot: "bg-indigo-500 dark:bg-indigo-300",
	},
	finance: {
		text: "text-emerald-700 dark:text-emerald-400",
		chip: "bg-emerald-600/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
		dot: "bg-emerald-600 dark:bg-emerald-400",
	},
	academics: {
		text: "text-amber-700 dark:text-amber-400",
		chip: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
		dot: "bg-amber-500 dark:bg-amber-400",
	},
	assessments: {
		text: "text-violet-600 dark:text-violet-300",
		chip: "bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
		dot: "bg-violet-500 dark:bg-violet-300",
	},
	assistant: {
		text: "text-slate-500 dark:text-slate-400",
		chip: "bg-slate-500/12 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
		dot: "bg-slate-500 dark:bg-slate-400",
	},
	system: {
		text: "text-slate-500 dark:text-slate-400",
		chip: "bg-slate-500/12 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
		dot: "bg-slate-500 dark:bg-slate-400",
	},
};

export function ActivityCategoryChip({
	category,
	icon,
	className,
}: {
	category: ActivityCategory;
	icon: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"grid size-6 shrink-0 place-items-center rounded-full",
				ACTIVITY_CATEGORY_STYLES[category]?.chip,
				className,
			)}
		>
			<ActivityIcon name={icon} className="size-3.5" />
		</span>
	);
}

const AVATAR_TONES = [
	"bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
	"bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
	"bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
	"bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200",
	"bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
	"bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
];

function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (!words.length) return "?";
	const first = words[0]?.[0] ?? "";
	const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
	return `${first}${last}`.toUpperCase();
}

function toneFor(seed: string) {
	let hash = 0;
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
	return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

const AVATAR_SIZES = {
	sm: "size-[22px] text-[9px]",
	md: "size-[30px] text-[11px]",
	lg: "size-9 text-xs",
} as const;

/** Initials avatar for the acting member; system activity gets a gear. */
export function ActivityAvatar({
	name,
	userId,
	size = "md",
	className,
}: {
	name: string;
	userId: string | null;
	size?: keyof typeof AVATAR_SIZES;
	className?: string;
}) {
	const system = !userId;
	return (
		<span
			aria-hidden
			className={cn(
				"grid shrink-0 place-items-center rounded-full font-semibold",
				AVATAR_SIZES[size],
				system
					? "bg-muted text-muted-foreground"
					: toneFor(userId ?? name),
				className,
			)}
		>
			{system ? <Settings2 className="size-3" /> : initials(name)}
		</span>
	);
}

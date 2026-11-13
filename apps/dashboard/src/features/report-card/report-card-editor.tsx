"use client";

import { useTRPC } from "@/trpc/client";
import { SAMPLE_REPORTS, SAMPLE_TERM } from "@school-clerk/pdf/report-card";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { Slider } from "@school-clerk/ui/slider";
import { Switch } from "@school-clerk/ui/switch";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@school-clerk/ui/tabs";
import { Textarea } from "@school-clerk/ui/textarea";
import { toast } from "@school-clerk/ui/use-toast";
import {
	ARABIC_REPORT_CARD_LABELS,
	ARABIC_TERM_ORDINALS,
	DEFAULT_REPORT_CARD_COMMENT_BANDS,
	ENGLISH_REPORT_CARD_LABELS,
	type ReportCardConfig,
	type ReportCardTemplateId,
	applyNameCalligraphy,
	createDefaultReportCardConfig,
	findCommentBandIssues,
	formatCalligraphyDictionary,
	parseCalligraphyDictionary,
	reportCardTemplateCatalog,
} from "@school-clerk/utils/report-card";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ReportCardPage } from "./report-card-page";
import { SignatureUploader } from "./signature-uploader";
import { StaffSignaturesPanel } from "./staff-signatures-panel";

type Updater = (draft: ReportCardConfig) => void;

function Field({
	label,
	hint,
	children,
	className,
}: { label: string; hint?: string; children: ReactNode; className?: string }) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label className="text-xs font-medium">{label}</Label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function Toggle({
	label,
	hint,
	checked,
	onChange,
	disabled,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<div className="flex items-start justify-between gap-4 py-1.5">
			<Label
				htmlFor={id}
				className="flex flex-col items-start gap-0 font-normal"
			>
				<span className="text-sm">{label}</span>
				{hint ? (
					<span className="text-xs text-muted-foreground">{hint}</span>
				) : null}
			</Label>
			<Switch
				id={id}
				checked={checked}
				onCheckedChange={onChange}
				disabled={disabled}
			/>
		</div>
	);
}

function Choice<T extends string>({
	value,
	onChange,
	options,
	disabled,
}: {
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: string }[];
	disabled?: boolean;
}) {
	return (
		<Select
			value={value}
			onValueChange={(next) => onChange(next as T)}
			disabled={disabled}
		>
			<SelectTrigger className="h-9">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function Section({
	title,
	children,
	action,
}: { title: string; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="flex flex-col gap-3 border-b pb-5 last:border-b-0">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">{title}</h3>
				{action}
			</div>
			{children}
		</section>
	);
}

const LABEL_FIELDS: {
	key: keyof ReportCardConfig["labels"];
	label: string;
	hint?: string;
}[] = [
	{ key: "studentName", label: "Student name" },
	{ key: "academicYear", label: "Academic year" },
	{ key: "classroom", label: "Class" },
	{ key: "term", label: "Term" },
	{ key: "percentage", label: "Percentage" },
	{ key: "totalScore", label: "Total score" },
	{ key: "position", label: "Position" },
	{
		key: "positionTemplate",
		label: "Position wording",
		hint: "Use {position}, {total} and {students}.",
	},
	{ key: "studentsFew", label: "Students (3–10)" },
	{ key: "studentsMany", label: "Students (11 and above, or 1–2)" },
	{ key: "resumptionDate", label: "Resumption date" },
	{ key: "subjects", label: "Subjects column" },
	{ key: "total", label: "Total column" },
	{ key: "commentPrimary", label: "First comment line" },
	{ key: "commentSecondary", label: "Second comment line" },
	{ key: "teacherSignature", label: "Class teacher signature" },
	{ key: "headSignature", label: "Head signature" },
];

function A4Preview({ children }: { children: ReactNode }) {
	const frameRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.6);
	useLayoutEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		const update = () => {
			// 210mm at 96 dpi.
			setScale(Math.min(1, frame.clientWidth / 793.7));
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);
	return (
		<div ref={frameRef} className="w-full">
			<div
				className="relative overflow-hidden"
				style={{ height: 1122.5 * scale }}
			>
				<div
					className="absolute left-0 top-0 origin-top-left shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
					style={{ transform: `scale(${scale})` }}
				>
					{children}
				</div>
			</div>
		</div>
	);
}

export function ReportCardEditor() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data: rawData } = useSuspenseQuery(
		trpc.reportCards.getTemplate.queryOptions(),
	);
	// tRPC cannot infer the config shape under this app's loose compiler settings.
	const data = rawData as typeof rawData & { config: ReportCardConfig };
	const canEdit = data.canEdit;
	const [templateId, setTemplateId] = useState<ReportCardTemplateId>(
		data.templateId,
	);
	const [config, setConfig] = useState<ReportCardConfig>(data.config);
	const [savedKey, setSavedKey] = useState(() =>
		JSON.stringify([data.templateId, data.config]),
	);
	const [sample, setSample] = useState<"short" | "long">("short");
	const [dictionaryText, setDictionaryText] = useState(() =>
		formatCalligraphyDictionary(data.config.calligraphy.dictionary),
	);
	const [tryName, setTryName] = useState("محمد بلال خديجة يونس");

	const dirty = JSON.stringify([templateId, config]) !== savedKey;
	const update = (fn: Updater) =>
		setConfig((current) => {
			const next = structuredClone(current);
			fn(next);
			return next;
		});

	useEffect(() => {
		const dictionary = parseCalligraphyDictionary(dictionaryText);
		setConfig((current) =>
			JSON.stringify(current.calligraphy.dictionary) ===
			JSON.stringify(dictionary)
				? current
				: { ...current, calligraphy: { ...current.calligraphy, dictionary } },
		);
	}, [dictionaryText]);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	const save = useMutation(
		trpc.reportCards.saveTemplate.mutationOptions({
			async onSuccess(result) {
				const savedConfig = result.config as ReportCardConfig;
				setSavedKey(JSON.stringify([result.templateId, savedConfig]));
				setConfig(savedConfig);
				await queryClient.invalidateQueries({
					queryKey: trpc.reportCards.getTemplate.queryKey(),
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.reportCards.getPrintContext.queryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to save the report card template",
					loading: "Saving report card template...",
					success: "Report card template saved.",
				},
			},
		}),
	);

	const bandIssues = useMemo(
		() => findCommentBandIssues(config.comments.bands),
		[config.comments.bands],
	);
	const disabled = !canEdit || save.isPending;
	const [pdfPending, setPdfPending] = useState(false);
	// Renders the unsaved settings with the PDF template the Print button uses.
	async function openPdfPreview() {
		const tab = window.open("", "_blank");
		setPdfPending(true);
		try {
			const response = await fetch("/api/pdf/report-card/preview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ templateId, config, sample }),
			});
			if (!response.ok) throw new Error(await response.text());
			const url = URL.createObjectURL(await response.blob());
			if (tab) tab.location.href = url;
			else if (!window.open(url, "_blank")) {
				toast({
					title: "Unable to open the PDF preview",
					description: "Allow pop-ups for this site, then try again.",
					variant: "destructive",
				});
			}
		} catch {
			tab?.close();
			toast({
				title: "Unable to open the PDF preview",
				description: "Try again in a moment.",
				variant: "destructive",
			});
		} finally {
			setPdfPending(false);
		}
	}
	const calligraphyPreview = applyNameCalligraphy(tryName, config.calligraphy);

	return (
		<div className="flex flex-col gap-6 pb-24">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Report card template
					</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Choose how printed report cards look. Scores, the term, the class
						and each teacher's signature are filled in when you print;
						everything else is set here.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{!canEdit ? <Badge variant="outline">View only</Badge> : null}
					{dirty ? <Badge variant="secondary">Unsaved changes</Badge> : null}
					<Button
						type="button"
						variant="ghost"
						disabled={disabled}
						onClick={() => {
							const defaults = createDefaultReportCardConfig({
								schoolName: data.schoolName,
							});
							setConfig(defaults);
							setDictionaryText("");
						}}
					>
						<RotateCcw data-icon="inline-start" />
						Reset
					</Button>
					{canEdit ? (
						<Button
							type="button"
							variant="outline"
							disabled={pdfPending}
							onClick={openPdfPreview}
						>
							<FileText data-icon="inline-start" />
							{pdfPending ? "Rendering…" : "Preview PDF"}
						</Button>
					) : null}
					<Button
						type="button"
						disabled={disabled || !dirty || !config.school.name.trim()}
						onClick={() => save.mutate({ templateId, config })}
					>
						{save.isPending ? "Saving…" : "Save template"}
					</Button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
				<Tabs defaultValue="design" className="min-w-0">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger value="design">Design</TabsTrigger>
						<TabsTrigger value="header">Header</TabsTrigger>
						<TabsTrigger value="comments">Comments</TabsTrigger>
						<TabsTrigger value="signatures">Signs</TabsTrigger>
						<TabsTrigger value="names">Names</TabsTrigger>
					</TabsList>

					<fieldset disabled={!canEdit} className="mt-4 flex flex-col gap-5">
						<TabsContent value="design" className="mt-0 flex flex-col gap-5">
							<Section title="Template">
								<div
									className="grid gap-2"
									role="radiogroup"
									aria-label="Report card template"
								>
									{reportCardTemplateCatalog.map((template) => (
										<button
											key={template.id}
											type="button"
											role="radio"
											aria-checked={templateId === template.id}
											disabled={disabled}
											onClick={() => setTemplateId(template.id)}
											className={cn(
												"rounded-md border p-3 text-start transition-colors hover:bg-accent disabled:cursor-not-allowed",
												templateId === template.id &&
													"border-primary bg-primary/5 ring-1 ring-primary",
											)}
										>
											<span className="block text-sm font-medium">
												{template.label}
											</span>
											<span className="block text-xs text-muted-foreground">
												{template.description}
											</span>
										</button>
									))}
								</div>
							</Section>
							<Section title="School">
								<Field label="School name">
									<Input
										value={config.school.name}
										onChange={(event) =>
											update((draft) => {
												draft.school.name = event.target.value;
											})
										}
										dir="auto"
									/>
								</Field>
								<Field label="Address">
									<Textarea
										rows={2}
										value={config.school.address}
										onChange={(event) =>
											update((draft) => {
												draft.school.address = event.target.value;
											})
										}
									/>
								</Field>
								<Field label="Address style">
									<Choice
										value={config.school.addressStyle}
										onChange={(value) =>
											update((draft) => {
												draft.school.addressStyle = value;
											})
										}
										options={[
											{ value: "script", label: "Handwritten script" },
											{ value: "plain", label: "Plain" },
										]}
									/>
								</Field>
							</Section>
							<Section title="Page and language">
								<div className="grid grid-cols-2 gap-3">
									<Field label="Direction">
										<Choice
											value={config.layout.direction}
											onChange={(value) =>
												update((draft) => {
													draft.layout.direction = value;
												})
											}
											options={[
												{ value: "rtl", label: "Right to left" },
												{ value: "ltr", label: "Left to right" },
											]}
										/>
									</Field>
									<Field label="Numbers">
										<Choice
											value={config.layout.numerals}
											onChange={(value) =>
												update((draft) => {
													draft.layout.numerals = value;
												})
											}
											options={[
												{ value: "arabic-indic", label: "Arabic (١٢٣)" },
												{ value: "western", label: "Western (123)" },
											]}
										/>
									</Field>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Load wording:
									</span>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											update((draft) => {
												draft.labels = { ...ARABIC_REPORT_CARD_LABELS };
												draft.layout.direction = "rtl";
												draft.layout.numerals = "arabic-indic";
												draft.header.termLabelMode = "ordinal";
												draft.header.termOrdinals = [...ARABIC_TERM_ORDINALS];
												draft.comments.secondaryDirection = "ltr";
											})
										}
									>
										Arabic
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											update((draft) => {
												draft.labels = { ...ENGLISH_REPORT_CARD_LABELS };
												draft.layout.direction = "ltr";
												draft.layout.numerals = "western";
												draft.header.termLabelMode = "title";
												draft.header.academicYearSuffix = "";
												draft.comments.secondaryDirection = "ltr";
											})
										}
									>
										English
									</Button>
								</div>
								<Field label={`Page margin · ${config.layout.pageMarginMm} mm`}>
									<Slider
										min={4}
										max={25}
										step={1}
										value={[config.layout.pageMarginMm]}
										onValueChange={([value]) =>
											update((draft) => {
												draft.layout.pageMarginMm = value ?? 10;
											})
										}
										disabled={disabled}
									/>
								</Field>
								<Field
									label={`Text size · ${Math.round(config.layout.fontScale * 100)}%`}
								>
									<Slider
										min={0.8}
										max={1.25}
										step={0.05}
										value={[config.layout.fontScale]}
										onValueChange={([value]) =>
											update((draft) => {
												draft.layout.fontScale = value ?? 1;
											})
										}
										disabled={disabled}
									/>
								</Field>
								<Toggle
									label="Fill the page"
									hint="Short reports get taller rows and more space; long reports tighten so every card prints on one page."
									checked={config.layout.fitToPage}
									onChange={(value) =>
										update((draft) => {
											draft.layout.fitToPage = value;
										})
									}
									disabled={disabled}
								/>
							</Section>
							<Section title="Subjects table">
								<Toggle
									label="Number the subjects"
									checked={config.table.numberSubjects}
									onChange={(value) =>
										update((draft) => {
											draft.table.numberSubjects = value;
										})
									}
									disabled={disabled}
								/>
								<Field
									label="Empty score mark"
									hint="Shown where no score was recorded."
								>
									<Input
										className="w-20"
										value={config.table.emptyCell}
										maxLength={4}
										onChange={(event) =>
											update((draft) => {
												draft.table.emptyCell = event.target.value;
											})
										}
									/>
								</Field>
							</Section>
						</TabsContent>

						<TabsContent value="header" className="mt-0 flex flex-col gap-5">
							<Section title="Details on the card">
								<Toggle
									label="Academic year"
									hint="Taken from the session of the term you print."
									checked={config.header.showAcademicYear}
									onChange={(value) =>
										update((draft) => {
											draft.header.showAcademicYear = value;
										})
									}
									disabled={disabled}
								/>
								{config.header.showAcademicYear ? (
									<Field
										label="Year suffix"
										hint="For example هـ for Hijri years."
									>
										<Input
											className="w-24"
											value={config.header.academicYearSuffix}
											onChange={(event) =>
												update((draft) => {
													draft.header.academicYearSuffix = event.target.value;
												})
											}
										/>
									</Field>
								) : null}
								<Toggle
									label="Term"
									hint="Taken from the term you print."
									checked={config.header.showTerm}
									onChange={(value) =>
										update((draft) => {
											draft.header.showTerm = value;
										})
									}
									disabled={disabled}
								/>
								{config.header.showTerm ? (
									<>
										<Field label="Term wording">
											<Choice
												value={config.header.termLabelMode}
												onChange={(value) =>
													update((draft) => {
														draft.header.termLabelMode = value;
													})
												}
												options={[
													{
														value: "title",
														label: "Use the term title as written",
													},
													{
														value: "ordinal",
														label: "Use my wording for 1st, 2nd, 3rd…",
													},
												]}
											/>
										</Field>
										{config.header.termLabelMode === "ordinal" ? (
											<div className="grid grid-cols-3 gap-2">
												{[0, 1, 2].map((index) => (
													<Field key={index} label={`Term ${index + 1}`}>
														<Input
															dir="auto"
															value={config.header.termOrdinals[index] ?? ""}
															onChange={(event) =>
																update((draft) => {
																	draft.header.termOrdinals[index] =
																		event.target.value;
																})
															}
														/>
													</Field>
												))}
											</div>
										) : null}
									</>
								) : null}
								<Toggle
									label="Percentage"
									checked={config.header.showPercentage}
									onChange={(value) =>
										update((draft) => {
											draft.header.showPercentage = value;
										})
									}
									disabled={disabled}
								/>
								<Toggle
									label="Total score"
									checked={config.header.showTotalScore}
									onChange={(value) =>
										update((draft) => {
											draft.header.showTotalScore = value;
										})
									}
									disabled={disabled}
								/>
								<Toggle
									label="Position in class"
									checked={config.header.showPosition}
									onChange={(value) =>
										update((draft) => {
											draft.header.showPosition = value;
										})
									}
									disabled={disabled}
								/>
								<Toggle
									label="Resumption date"
									hint="Set on each term under Academic → Edit term."
									checked={config.header.showResumptionDate}
									onChange={(value) =>
										update((draft) => {
											draft.header.showResumptionDate = value;
										})
									}
									disabled={disabled}
								/>
								{config.header.showResumptionDate ? (
									<Field label="Date format">
										<Choice
											value={config.header.dateFormat}
											onChange={(value) =>
												update((draft) => {
													draft.header.dateFormat = value;
												})
											}
											options={[
												{ value: "dd/MM/yy", label: "28/03/26" },
												{ value: "dd/MM/yyyy", label: "28/03/2026" },
												{ value: "d MMMM yyyy", label: "28 March 2026" },
											]}
										/>
									</Field>
								) : null}
							</Section>
							<Section title="Wording">
								<div className="grid gap-3 sm:grid-cols-2">
									{LABEL_FIELDS.map((field) => (
										<Field
											key={field.key}
											label={field.label}
											hint={field.hint}
											className={
												field.key === "positionTemplate"
													? "sm:col-span-2"
													: undefined
											}
										>
											<Input
												dir="auto"
												value={config.labels[field.key]}
												onChange={(event) =>
													update((draft) => {
														draft.labels[field.key] = event.target.value;
													})
												}
											/>
										</Field>
									))}
								</div>
							</Section>
						</TabsContent>

						<TabsContent value="comments" className="mt-0 flex flex-col gap-5">
							<Section title="Comment area">
								<Toggle
									label="Print the comment area"
									checked={config.comments.enabled}
									onChange={(value) =>
										update((draft) => {
											draft.comments.enabled = value;
										})
									}
									disabled={disabled}
								/>
								{config.comments.enabled ? (
									<>
										<Field label="What goes on the lines">
											<Choice
												value={config.comments.mode}
												onChange={(value) =>
													update((draft) => {
														draft.comments.mode = value;
													})
												}
												options={[
													{
														value: "auto",
														label: "Comment from the student's percentage",
													},
													{
														value: "blank",
														label: "Empty lines to write on after printing",
													},
												]}
											/>
										</Field>
										<Toggle
											label="First line"
											hint={config.labels.commentPrimary}
											checked={config.comments.showPrimary}
											onChange={(value) =>
												update((draft) => {
													draft.comments.showPrimary = value;
												})
											}
											disabled={disabled}
										/>
										<Toggle
											label="Second line"
											hint={config.labels.commentSecondary}
											checked={config.comments.showSecondary}
											onChange={(value) =>
												update((draft) => {
													draft.comments.showSecondary = value;
												})
											}
											disabled={disabled}
										/>
										{config.comments.showSecondary ? (
											<Field label="Second line direction">
												<Choice
													value={config.comments.secondaryDirection}
													onChange={(value) =>
														update((draft) => {
															draft.comments.secondaryDirection = value;
														})
													}
													options={[
														{ value: "ltr", label: "Left to right" },
														{ value: "rtl", label: "Right to left" },
													]}
												/>
											</Field>
										) : null}
										{config.comments.mode === "blank" ? (
											<Field label="Lines per comment">
												<Choice
													value={String(config.comments.blankLines)}
													onChange={(value) =>
														update((draft) => {
															draft.comments.blankLines = Number(value);
														})
													}
													options={["1", "2", "3", "4"].map((value) => ({
														value,
														label: value,
													}))}
												/>
											</Field>
										) : null}
									</>
								) : null}
							</Section>
							{config.comments.enabled && config.comments.mode === "auto" ? (
								<Section
									title="Comments by percentage"
									action={
										<div className="flex gap-1">
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() =>
													update((draft) => {
														draft.comments.bands =
															DEFAULT_REPORT_CARD_COMMENT_BANDS.map((band) => ({
																...band,
															}));
													})
												}
											>
												Defaults
											</Button>
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={config.comments.bands.length >= 12}
												onClick={() =>
													update((draft) => {
														draft.comments.bands.push({
															min: 0,
															max: 0,
															primary: "",
															secondary: "",
														});
													})
												}
											>
												<Plus data-icon="inline-start" />
												Add
											</Button>
										</div>
									}
								>
									{bandIssues.length ? (
										<ul className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
											{bandIssues.map((issue) => (
												<li key={issue}>{issue}</li>
											))}
										</ul>
									) : null}
									<div className="flex flex-col gap-3">
										{config.comments.bands.map((band, index) => (
											<div
												key={index}
												className="flex flex-col gap-2 rounded-md border p-3"
											>
												<div className="flex items-center gap-2">
													<Input
														type="number"
														aria-label="From percent"
														className="h-8 w-20"
														min={0}
														max={100}
														value={band.min}
														onChange={(event) =>
															update((draft) => {
																const target = draft.comments.bands[index];
																if (target) target.min = Number(event.target.value);
															})
														}
													/>
													<span className="text-xs text-muted-foreground">
														to
													</span>
													<Input
														type="number"
														aria-label="To percent"
														className="h-8 w-20"
														min={0}
														max={100}
														value={band.max}
														onChange={(event) =>
															update((draft) => {
																const target = draft.comments.bands[index];
																if (target) target.max = Number(event.target.value);
															})
														}
													/>
													<span className="text-xs text-muted-foreground">
														%
													</span>
													<Button
														type="button"
														size="icon"
														variant="ghost"
														className="ms-auto size-8"
														aria-label="Remove comment"
														onClick={() =>
															update((draft) => {
																draft.comments.bands.splice(index, 1);
															})
														}
													>
														<Trash2 className="size-4" />
													</Button>
												</div>
												<Input
													dir="auto"
													placeholder={config.labels.commentPrimary}
													value={band.primary}
													onChange={(event) =>
														update((draft) => {
															const target = draft.comments.bands[index];
															if (target) target.primary = event.target.value;
														})
													}
												/>
												<Input
													dir="auto"
													placeholder={config.labels.commentSecondary}
													value={band.secondary}
													onChange={(event) =>
														update((draft) => {
															const target = draft.comments.bands[index];
															if (target) target.secondary = event.target.value;
														})
													}
												/>
											</div>
										))}
									</div>
								</Section>
							) : null}
						</TabsContent>

						<TabsContent
							value="signatures"
							className="mt-0 flex flex-col gap-5"
						>
							<Section title="Head of school">
								<Toggle
									label="Print the head's signature space"
									checked={config.signatures.showHead}
									onChange={(value) =>
										update((draft) => {
											draft.signatures.showHead = value;
										})
									}
									disabled={disabled}
								/>
								{config.signatures.showHead ? (
									<SignatureUploader
										value={config.signatures.headImageUrl}
										disabled={disabled}
										onChange={(value) =>
											update((draft) => {
												draft.signatures.headImageUrl = value;
											})
										}
									/>
								) : null}
							</Section>
							<Section title="Class teacher">
								<Toggle
									label="Print the class teacher's signature space"
									checked={config.signatures.showTeacher}
									onChange={(value) =>
										update((draft) => {
											draft.signatures.showTeacher = value;
										})
									}
									disabled={disabled}
								/>
								{config.signatures.showTeacher ? (
									<Toggle
										label="Add the class teacher's saved signature"
										hint="Uses the signature of the first teacher assigned to each class who has uploaded one. Leave off to sign by hand."
										checked={config.signatures.useClassTeacherSignature}
										onChange={(value) =>
											update((draft) => {
												draft.signatures.useClassTeacherSignature = value;
											})
										}
										disabled={disabled}
									/>
								) : null}
							</Section>
							{canEdit ? <StaffSignaturesPanel /> : null}
						</TabsContent>

						<TabsContent value="names" className="mt-0 flex flex-col gap-5">
							<Section title="Arabic name calligraphy">
								<p className="text-xs text-muted-foreground">
									Stretches Arabic names with a kashida (ـ) so they sit wide and
									even on the name line.
								</p>
								<Field label="Stretching">
									<Choice
										value={config.calligraphy.mode}
										onChange={(value) =>
											update((draft) => {
												draft.calligraphy.mode = value;
											})
										}
										options={[
											{ value: "off", label: "Off" },
											{ value: "dictionary", label: "Only names in the list" },
											{
												value: "auto",
												label: "List, then every other Arabic name",
											},
										]}
									/>
								</Field>
								{config.calligraphy.mode === "auto" ? (
									<Field
										label={`Stretch length · ${config.calligraphy.kashidaLength}`}
									>
										<Slider
											min={1}
											max={14}
											step={1}
											value={[config.calligraphy.kashidaLength]}
											onValueChange={([value]) =>
												update((draft) => {
													draft.calligraphy.kashidaLength = value ?? 10;
												})
											}
											disabled={disabled}
										/>
									</Field>
								) : null}
								{config.calligraphy.mode !== "off" ? (
									<>
										<Toggle
											label="Use the built-in name list"
											hint="About 160 common names, hand-stretched for Darul Hadith."
											checked={config.calligraphy.useDefaultDictionary}
											onChange={(value) =>
												update((draft) => {
													draft.calligraphy.useDefaultDictionary = value;
												})
											}
											disabled={disabled}
										/>
										<Field
											label="Your names"
											hint="One per line as name = stretched name. Write a name as itself to stop it stretching."
										>
											<Textarea
												dir="rtl"
												rows={6}
												className="font-code text-sm"
												placeholder={"أحمد = أحمــــد\nعبد = عبد"}
												value={dictionaryText}
												onChange={(event) =>
													setDictionaryText(event.target.value)
												}
											/>
										</Field>
									</>
								) : null}
								<Field label="Try a name">
									<Input
										dir="rtl"
										value={tryName}
										onChange={(event) => setTryName(event.target.value)}
									/>
									<p
										dir="rtl"
										className="rounded-md border bg-white p-3 text-center text-2xl text-black"
									>
										{calligraphyPreview}
									</p>
								</Field>
							</Section>
						</TabsContent>
					</fieldset>
				</Tabs>

				<div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
						<span className="text-sm font-medium">Preview</span>
						<div
							className="flex rounded-md border p-0.5"
							role="group"
							aria-label="Sample report"
						>
							{(
								[
									["short", "Lower class · 4 subjects"],
									["long", "Upper class · 12 subjects"],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									type="button"
									onClick={() => setSample(key)}
									className={cn(
										"rounded px-2.5 py-1 text-xs transition-colors",
										sample === key
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>
					<A4Preview>
						<ReportCardPage
							templateId={templateId}
							config={config}
							report={SAMPLE_REPORTS[sample]}
							term={SAMPLE_TERM}
							teacherSignatureUrl={null}
						/>
					</A4Preview>
					<p className="mt-2 text-xs text-muted-foreground">
						Sample student. The teacher's signature appears when you print a
						class that has one saved.
					</p>
				</div>
			</div>
		</div>
	);
}

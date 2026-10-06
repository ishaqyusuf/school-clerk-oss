"use client";

import { MobileFilterSheet, FilterMenuTrigger, type FilterValues } from "@school-clerk/ui/search-filter/mobile-filter-sheet";
import { filterGroupSummary } from "@school-clerk/ui/search-filter/mobile-filter-model";
import { CalendarPopover } from "@school-clerk/ui/calendar-popover";
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { PageFilterData } from "@/types";
import { useQueryStates } from "nuqs";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@school-clerk/ui/cn";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { Icons } from "@school-clerk/ui/icons";
import { Input } from "@school-clerk/ui/input";
import { Button } from "@school-clerk/ui/button";

import { Icon } from "@school-clerk/ui/custom/icons";
import { SelectTag } from "../select-tag";
import { FilterList } from "./filter-list";
import { getSearchKey, isSearchKey, searchIcons } from "./search-utils";
import { DateRangeFilter } from "@school-clerk/ui/search-filter/date-range-filter";
import { useSearchFilterContext } from "@/hooks/use-search-filter";
import {
	formatDateFilterLabel,
} from "./date-filter-model";

interface Props {
	className?: string;
	// filters;
	// setFilters;
	defaultSearch?;
	placeholder?;
	filterList?: PageFilterData[];
	trpcFilter?;
	filterSchema?;
	onOptionSelected?: (filter: PageFilterData, option: any) => boolean;
	hasFilterSource?: boolean;
	debounceSearch?: boolean;
	loading?: boolean;
	error?: string;
	onRetry?: () => void;
	resolveMobileFilters?: (draft: FilterValues) => PageFilterData[];
	onDraftOptionSelected?: (draft: FilterValues, filter: PageFilterData, option: any) => FilterValues | null;
	onFilterRemove?: (filterKey: string) => Record<string, unknown> | null;
}

export function SearchFilter({
	className,
	placeholder,
	defaultSearch = {},
	filterList,
	onOptionSelected,
	onFilterRemove,
	hasFilterSource, debounceSearch, loading, error, onRetry, resolveMobileFilters, onDraftOptionSelected,
}: Props) {
	const {
		isFocused,
		isOpen,
		setIsOpen,
		shouldFetch,
		filters,
		setFilters,
		isMultiple,
		optionSelected,
	} = useSearchFilterContext();
	const mobileCalendar = useIsMobile();
	const [prompt, setPrompt] = useState(() => { const key = Object.keys(filters ?? {}).find(isSearchKey); return key ? String(filters[key] ?? "") : ""; });
	const debouncedPrompt = useDebounce(prompt, 1500);
	const searchMounted = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const filterTriggerRef = useRef<HTMLButtonElement>(null);

	const [streaming, setStreaming] = useState(false);


	useHotkeys(
		"esc",
		() => {
			if (mobileCalendar || isOpen) return;
			setPrompt("");
			setFilters(defaultSearch);
			setIsOpen(false);
		},
		{
			enableOnFormTags: true,
			enabled: Boolean(prompt) && !isOpen && !mobileCalendar,
		},
	);

	useHotkeys("meta+s", (evt) => {
		evt.preventDefault();
		inputRef.current?.focus();
	});

	useHotkeys("meta+f", (evt) => {
		evt.preventDefault();
		setIsOpen((prev) => !prev);
	});

	useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
    if (debounceSearch) { const key = getSearchKey(filters); if (key) setFilters({ [key]: debouncedPrompt || null }); }
  }, [debouncedPrompt]);

	const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
		const value = evt.target.value;

		if (value) {
			setPrompt(value);
		} else {
			setFilters(defaultSearch);
			setPrompt("");
		}
	};

	const handleSubmit = async () => {
		// If the user is typing a query with multiple words, we want to stream the results
		const searchKey = getSearchKey(filters);
		console.log({ searchKey });

		if (searchKey)
			setFilters({
				[searchKey]: prompt.length > 0 ? prompt : null,
			});
	};
	const hasValidFilters =
		Object.entries(filters).filter(
			([key, value]) => value !== null && !isSearchKey(key),
		).length > 0;

	const previousMobile = useRef(mobileCalendar);
	useEffect(() => { if (previousMobile.current !== mobileCalendar) setIsOpen(false); previousMobile.current = mobileCalendar; }, [mobileCalendar]);
	const __filters = (filterList || [])?.filter((a) => !isSearchKey(a.value));
	const toGroups = (definitions: PageFilterData[]) => definitions.filter((f) => !isSearchKey(f.value)).map((f) => ({ key: String(f.value), label: f.label || String(f.value).split(".").join(" "), options: f.options, multiple: isMultiple(f.value), type: f.type }));
	return (
		<>
		<DropdownMenu open={!mobileCalendar && isOpen} onOpenChange={setIsOpen}>
			<div className={cn("flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:gap-4", className)}>
				<form
					className="relative w-full md:w-auto"
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
					<Input
						ref={inputRef}
						placeholder={placeholder}
						aria-label={placeholder || "Search"}
						className="w-full pl-9 pr-12 md:w-[350px]"
						value={prompt}
						onChange={handleSearch}
						autoComplete="off"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck="false"
					/>
					<FilterMenuTrigger mobile={mobileCalendar}
						// className={cn(__filters.length || "hidden")}
					>
						<button
							ref={filterTriggerRef}
              hidden={!__filters.length && !loading && !error && !hasFilterSource}
							aria-haspopup={mobileCalendar ? "dialog" : "menu"}
							aria-expanded={isOpen}
							aria-label="Search filters"
							onClick={() => { if (mobileCalendar) setIsOpen(true); }}
							type="button"
							className={cn(
								"absolute right-0 top-0 z-10 flex size-11 items-center justify-center opacity-50 transition-opacity hover:opacity-100",
								hasValidFilters && "opacity-100",
								isOpen && "opacity-100",
							)}
						>
							<Icons.Filter className="size-4" />
						</button>
					</FilterMenuTrigger>
				</form>
				<FilterList
					loading={streaming}
					onRemove={(obj) => {
						const filterKey = Object.keys(obj)[0];
						const linkedUpdate = filterKey ? onFilterRemove?.(filterKey) : null;
						setFilters(linkedUpdate ?? obj);
						const clearPrompt = Object.entries(obj).find(([k, v]) =>
							isSearchKey(k),
						)?.[0];
						if (clearPrompt) setPrompt("");
					}}
					filters={filters}
					filterList={__filters}
				/>
			</div>
			<DropdownMenuContent
				className={cn("w-[350px] max-w-[calc(100vw-2rem)]")}
				sideOffset={19}
				alignOffset={-11}
				side="bottom"
				align="end"
			>
				{__filters?.map((f, i) => (
					<DropdownMenuGroup key={i}>
						{mobileCalendar && f.type === "date-range" ? (
							<CalendarPopover
								title={f.label || "Choose date range"}
								trigger={
									<DropdownMenuItem
										onSelect={(event) => event.preventDefault()}
									>
										{f.label || f.value?.split(".").join(" ")}
									</DropdownMenuItem>
								}
							>
								<DateRangeFilter
									value={filters?.[f.value]}
									onChange={(value) => setFilters({ [f.value]: value })}
								/>
							</CalendarPopover>
						) : (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Icon
										name={(f.icon ?? searchIcons[f.value]) as any}
										className={"mr-2 size-4"}
									/>
									<span className="capitalize">
										{f.label || f.value?.split(".").join(" ")}
									</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent
										sideOffset={14}
										alignOffset={-4}
										className="p-0"
									>
										{f.type == "date-range" ? (
											<DateRangeFilter
												value={filters?.[f.value]}
												onChange={(value) => setFilters({ [f.value]: value })}
											/>
										) : f.options?.length > 20 ? (
											<>
												<SelectTag
													headless
													data={f.options?.map((opt) => ({
														...opt,
														label: opt.label,
														id: opt.value,
													}))}
													onChange={(selected) => {
														const option = {
															...selected,
															value: selected.id,
														};
														if (!onOptionSelected?.(f, option)) {
															optionSelected(f.value, option);
														}
													}}
												/>
											</>
										) : (
											f.options?.map(({ label, value }, _i) => {
												const selectedValue = filters?.[f.value];
												const checked = Array.isArray(selectedValue)
													? selectedValue.includes(value)
													: selectedValue === value;

												return (
													<DropdownMenuCheckboxItem
														checked={checked}
														onSelect={(event) => event.preventDefault()}
														onCheckedChange={() => {
															const option = {
																...f.options?.find(
																	(candidate) => candidate.value === value,
																),
																value,
																label,
															};
															if (!onOptionSelected?.(f, option)) {
																optionSelected(f.value, option);
															}
														}}
														key={_i}
													>
														{label}
													</DropdownMenuCheckboxItem>
												);
											})
										)}
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						)}
					</DropdownMenuGroup>
				))}
			</DropdownMenuContent>
		</DropdownMenu>

      {mobileCalendar && <MobileFilterSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        triggerRef={filterTriggerRef}
        values={filters}
        groups={toGroups(__filters)}
        onApply={setFilters}
        loading={loading}
        error={error}
        onRetry={onRetry}
        resolveGroups={
          resolveMobileFilters
            ? (draft) => toGroups(resolveMobileFilters(draft))
            : undefined
        }
        onSelectOption={(draft, group, option) =>
          option.value === ""
            ? (onFilterRemove?.(group.key) ?? null)
            : (onDraftOptionSelected?.(
                draft,
                (resolveMobileFilters?.(draft) ?? __filters).find(
                  (f) => f.value === group.key,
                )!,
                option,
              ) ?? null)
        }
        summary={(group, value) =>
          group.type === "date-range"
            ? formatDateFilterLabel(value) || "All dates"
            : filterGroupSummary(group, value)
        }
        renderGroup={(group, value, update) =>
          group.type === "date-range" ? (
            <DateRangeFilter
              value={value}
              onChange={(next) => update({ [group.key]: next })}
              mobile
            />
          ) : undefined
        }
      />}
		</>
	);
}

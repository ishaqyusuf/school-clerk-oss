"use client";

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
import { Calendar } from "@school-clerk/ui/calendar";
import { useSearchFilterContext } from "@/hooks/use-search-filter";
import { daysFilters } from "@school-clerk/utils/constants";
import {
  dateFilterValueToSelection,
  dateRangeSelectionToFilterValue,
  normalizeDateFilterValue,
} from "./date-filter-model";

interface Props {
  // filters;
  // setFilters;
  defaultSearch?;
  placeholder?;
  filterList?: PageFilterData[];
  trpcFilter?;
  filterSchema?;
  onOptionSelected?: (filter: PageFilterData, option: any) => boolean;
  onFilterRemove?: (filterKey: string) => Record<string, unknown> | null;
}

export function SearchFilter({
  placeholder,
  defaultSearch = {},
  filterList,
  onOptionSelected,
  onFilterRemove,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [streaming, setStreaming] = useState(false);

  const {
    isFocused,
    isOpen,
    setIsOpen,
    shouldFetch,
    filters,
    setFilters,
    optionSelected,
  } = useSearchFilterContext();
  useHotkeys(
    "esc",
    () => {
      setPrompt("");
      setFilters(defaultSearch);
      setIsOpen(false);
    },
    {
      enableOnFormTags: true,
      enabled: Boolean(prompt),
    }
  );

  useHotkeys("meta+s", (evt) => {
    evt.preventDefault();
    inputRef.current?.focus();
  });

  useHotkeys("meta+f", (evt) => {
    evt.preventDefault();
    setIsOpen((prev) => !prev);
  });

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
      ([key, value]) => value !== null && !isSearchKey(key)
    ).length > 0;

  const __filters = (filterList || [])?.filter((a) => !isSearchKey(a.value));
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center space-x-4">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 md:w-[350px]"
            value={prompt}
            onChange={handleSearch}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <DropdownMenuTrigger
            // className={cn(__filters.length || "hidden")}
            asChild
          >
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
              className={cn(
                "absolute right-3 top-[10px] z-10 opacity-50 transition-opacity duration-300 hover:opacity-100",
                hasValidFilters && "opacity-100",
                isOpen && "opacity-100"
              )}
            >
              <Icons.Filter className="size-4" />
            </button>
          </DropdownMenuTrigger>
        </form>
        <FilterList
          loading={streaming}
          onRemove={(obj) => {
            const filterKey = Object.keys(obj)[0];
            const linkedUpdate = filterKey ? onFilterRemove?.(filterKey) : null;
            setFilters(linkedUpdate ?? obj);
            const clearPrompt = Object.entries(obj).find(([k, v]) =>
              isSearchKey(k)
            )?.[0];
            if (clearPrompt) setPrompt("");
          }}
          filters={filters}
          filterList={__filters}
        />
      </div>
      <DropdownMenuContent
        className={cn("w-[350px]")}
        sideOffset={19}
        alignOffset={-11}
        side="bottom"
        align="end"
      >
        {__filters?.map((f, i) => (
          <DropdownMenuGroup key={i}>
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
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DateRangeFilterProps = {
  value: unknown;
  onChange: (value: string[] | null) => void;
};

function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const normalizedValue = normalizeDateFilterValue(value);
  const activePreset =
    normalizedValue.length === 1 &&
    daysFilters.includes(normalizedValue[0] as (typeof daysFilters)[number])
      ? normalizedValue[0]
      : null;

  return (
    <div className="flex max-w-[min(95vw,42rem)] flex-col sm:flex-row">
      <div className="grid min-w-40 grid-cols-2 gap-1 border-b p-2 sm:grid-cols-1 sm:border-r sm:border-b-0">
        {daysFilters.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "justify-start capitalize",
              activePreset === preset && "bg-accent font-medium",
            )}
            onClick={() => onChange([preset])}
          >
            {preset}
          </Button>
        ))}
      </div>
      <Calendar
        mode="range"
        initialFocus
        selected={dateFilterValueToSelection(value)}
        onSelect={(range) => onChange(dateRangeSelectionToFilterValue(range))}
      />
    </div>
  );
}

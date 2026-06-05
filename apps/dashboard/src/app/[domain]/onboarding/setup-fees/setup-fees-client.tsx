"use client";

import { useTRPC } from "@/trpc/client";
import {
  TenantLink as Link,
  useTenantRouter as useRouter,
} from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NumericFormat } from "react-number-format";

type FeeItemType = "TUITION_FEE" | "BOOK" | "OTHER";
type FeeLine = {
  id?: string | null;
  description: string;
  amount: number | null;
};
type FeeGroup = {
  streamId: string | null;
  streamName: string;
  required: boolean;
  lines: FeeLine[];
};
type ExistingFinanceItem = {
  id: string;
  type?: string | null;
  name?: string | null;
  amount?: number | null;
  description?: string | null;
  streamId?: string | null;
  streamName?: string | null;
  collectable?: boolean | null;
  isActive?: boolean | null;
  classroomDepartments?: { id: string }[];
};

const initialFees: FeeGroup[] = [
  {
    streamId: null,
    streamName: "PTA Levy",
    required: true,
    lines: [{ description: "PTA Levy", amount: null }],
  },
];

function inferFeeItemType(title: string): FeeItemType {
  const normalized = title.toLowerCase();

  if (normalized.includes("tuition")) return "TUITION_FEE";
  if (normalized.includes("book")) return "BOOK";

  return "OTHER";
}

export function SetupFeesOnboardingClient({ domain }: { domain: string }) {
  void domain;
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fees, setFees] = useState<FeeGroup[]>(initialFees);
  const [savedCount, setSavedCount] = useState(0);
  const hasHydratedSavedFeesRef = useRef(false);

  const { data: streams = [] } = useQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" }),
  );
  const { data: financeItems = [] } = useQuery(
    trpc.finance.getItems.queryOptions(),
  );

  const createItem = useMutation(
    trpc.finance.createItem.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.finance.getItems.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.finance.overview.queryKey(),
          }),
        ]);
      },
    }),
  );

  const feeTitleOptions = useMemo(() => {
    const options = new Map<
      string,
      { id: string; label: string; streamId?: string }
    >();

    for (const title of [
      "PTA Levy",
      "Exam Fee",
      "Development Levy",
      "ID Card",
      "Portal Fee",
      "Tuition Fee",
      "Books",
      "Uniform",
    ]) {
      options.set(title.toLowerCase(), { id: `preset:${title}`, label: title });
    }

    for (const stream of streams) {
      options.set(stream.name.toLowerCase(), {
        id: stream.id,
        label: stream.name,
        streamId: stream.id,
      });
    }

    for (const item of financeItems as ExistingFinanceItem[]) {
      const title = item.streamName || item.name;
      if (!title) continue;

      options.set(title.toLowerCase(), {
        id: `item:${title}`,
        label: title,
        streamId: item.streamId ?? undefined,
      });
    }

    return Array.from(options.values());
  }, [financeItems, streams]);

  useEffect(() => {
    if (hasHydratedSavedFeesRef.current) return;

    const generalFeeItems = (financeItems as ExistingFinanceItem[]).filter(
      (item) =>
        item.isActive !== false &&
        !(item.classroomDepartments?.length ?? 0) &&
        (item.streamName || item.name),
    );

    if (!generalFeeItems.length) return;

    const groupedFees = new Map<string, FeeGroup>();

    for (const item of generalFeeItems) {
      const streamName = item.streamName || item.name || "";
      if (!streamName) continue;

      const key = `${item.streamId ?? ""}:${streamName.toLowerCase()}`;
      const group =
        groupedFees.get(key) ??
        ({
          streamId: item.streamId ?? null,
          streamName,
          required: Boolean(item.collectable),
          lines: [],
        } satisfies FeeGroup);

      group.required = group.required || Boolean(item.collectable);
      group.lines.push({
        id: item.id,
        description: item.description || item.name || streamName,
        amount: item.amount ?? null,
      });
      groupedFees.set(key, group);
    }

    const nextFees = Array.from(groupedFees.values());
    if (nextFees.length) {
      setFees(nextFees);
      hasHydratedSavedFeesRef.current = true;
    }
  }, [financeItems]);

  function getDescriptionOptions(feeTitle?: string | null) {
    const normalizedTitle = feeTitle?.trim().toLowerCase();
    const options = new Map<string, { id: string; label: string }>();
    const presets: Record<string, string[]> = {
      "pta levy": ["PTA Levy"],
      "exam fee": ["Midterm Assessment", "Final Assessment"],
      "development levy": ["Development Levy"],
      "id card": ["Student ID Card"],
      "portal fee": ["Portal Access"],
      books: ["English Language", "Mathematics", "Basic Science"],
      uniform: ["Shirt", "Trousers", "Sportswear"],
      "tuition fee": ["Basic Tuition Fee"],
    };

    for (const description of presets[normalizedTitle || ""] ?? []) {
      options.set(description.toLowerCase(), {
        id: `preset:${description}`,
        label: description,
      });
    }

    for (const item of financeItems as ExistingFinanceItem[]) {
      if (
        normalizedTitle &&
        item.streamName?.trim().toLowerCase() !== normalizedTitle &&
        item.name?.trim().toLowerCase() !== normalizedTitle
      ) {
        continue;
      }

      if (!item.name) continue;

      options.set(item.name.toLowerCase(), {
        id: `item:${item.name}`,
        label: item.name,
      });
    }

    return Array.from(options.values());
  }

  const updateFee = (index: number, next: Partial<FeeGroup>) => {
    setFees((current) =>
      current.map((fee, feeIndex) =>
        feeIndex === index ? { ...fee, ...next } : fee,
      ),
    );
  };

  const updateLine = (
    feeIndex: number,
    lineIndex: number,
    next: Partial<FeeLine>,
  ) => {
    setFees((current) =>
      current.map((fee, index) =>
        index === feeIndex
          ? {
              ...fee,
              lines: fee.lines.map((line, currentLineIndex) =>
                currentLineIndex === lineIndex ? { ...line, ...next } : line,
              ),
            }
          : fee,
      ),
    );
  };

  function findExistingFeeLine(streamName: string, description: string) {
    const normalizedStreamName = streamName.trim().toLowerCase();
    const normalizedDescription = description.trim().toLowerCase();

    return (financeItems as ExistingFinanceItem[]).find(
      (item) =>
        item.isActive !== false &&
        !(item.classroomDepartments?.length ?? 0) &&
        item.streamName?.trim().toLowerCase() === normalizedStreamName &&
        (item.name?.trim().toLowerCase() === normalizedDescription ||
          item.description?.trim().toLowerCase() === normalizedDescription),
    );
  }

  const saveFees = async () => {
    const inputs = fees.flatMap((fee) => {
      const streamName = fee.streamName.trim();
      if (!streamName) return [];

      return fee.lines
        .filter((line) => line.description.trim() && line.amount)
        .map((line) => {
          const name = line.description.trim();
          const type = inferFeeItemType(streamName);
          const existingItem = (financeItems as ExistingFinanceItem[]).find(
            (item) =>
              (line.id && item.id === line.id) ||
              item.type === type &&
              item.streamName?.trim().toLowerCase() ===
                streamName.toLowerCase() &&
              item.name?.trim().toLowerCase() === name.toLowerCase(),
          );

          return {
            accountType: "CREDIT" as const,
            amount: line.amount ?? 0,
            classRoomDepartmentIds: [],
            collectable: Boolean(existingItem?.collectable || fee.required),
            description: name,
            id: existingItem?.id ?? line.id ?? null,
            isActive: true,
            name,
            sessionId: null,
            streamId: fee.streamId || existingItem?.streamId || null,
            streamName,
            termId: null,
            type,
          };
        });
    });

    for (const input of inputs) {
      await createItem.mutateAsync(input);
    }

    setSavedCount(inputs.length);
    router.push("/onboarding/invite-staff");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[2rem] border-border/70 shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1.5 text-sm"
            >
              Onboarding step 4 of 5
            </Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">
              Set up general fees
            </h1>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Add fees that apply to every class in the current term. Leave
              class-specific tuition, books, or uniforms inside each classroom.
            </p>
          </div>

          {savedCount > 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">
                  {savedCount} general fee item{savedCount === 1 ? "" : "s"}{" "}
                  saved
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                These fees are available to all classes because no classroom
                scope was attached.
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">Applies to:</span> All
            classes. Required fees are collectable by default; optional fees are
            available without being treated as required debt.
          </div>

          <div className="grid gap-4">
            {fees.map((fee, feeIndex) => {
              const selectedFeeTitle =
                feeTitleOptions.find(
                  (option) => option.label === fee.streamName,
                ) ||
                (fee.streamName
                  ? { id: `current:${fee.streamName}`, label: fee.streamName }
                  : undefined);

              return (
                <div
                  key={feeIndex}
                  className="grid gap-3 rounded-md border bg-background p-3"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2">
                      <Label>Fee Title</Label>
                      <ComboboxDropdown
                        items={feeTitleOptions}
                        selectedItem={selectedFeeTitle}
                        placeholder="Select or create a fee title"
                        searchPlaceholder="Search or create fee title..."
                        onSelect={(item) =>
                          updateFee(feeIndex, {
                            streamId: item.streamId ?? null,
                            streamName: item.label,
                          })
                        }
                        onCreate={(value) =>
                          updateFee(feeIndex, {
                            streamId: null,
                            streamName: value.trim(),
                          })
                        }
                        renderOnCreate={(value) => (
                          <span>Create new fee title "{value}"</span>
                        )}
                      />
                    </div>
                    {fees.length > 1 ? (
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setFees((current) =>
                              current.filter((_, index) => index !== feeIndex),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    {fee.lines.map((line, lineIndex) => {
                      const descriptionOptions = getDescriptionOptions(
                        fee.streamName,
                      );
                      const selectedDescription =
                        descriptionOptions.find(
                          (option) => option.label === line.description,
                        ) ||
                        (line.description
                          ? {
                              id: `current:${line.description}`,
                              label: line.description,
                            }
                          : undefined);

                      return (
                        <div
                          key={lineIndex}
                          className="flex flex-col gap-3 md:flex-row md:items-end"
                        >
                          <div className="grid gap-2 md:w-1/5">
                            {lineIndex === 0 ? <Label>Fee Type</Label> : null}
                            {lineIndex === 0 ? (
                              <Select
                                value={fee.required ? "required" : "optional"}
                                onValueChange={(value) =>
                                  updateFee(feeIndex, {
                                    required: value === "required",
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="required">
                                    Required
                                  </SelectItem>
                                  <SelectItem value="optional">
                                    Optional
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="hidden h-10 md:block" />
                            )}
                          </div>
                          <div className="grid gap-2 md:w-full">
                            {lineIndex === 0 ? <Label>Description</Label> : null}
                            <ComboboxDropdown
                              items={descriptionOptions}
                              selectedItem={selectedDescription}
                              placeholder="Select or create description"
                              searchPlaceholder="Search or create description..."
                              onSelect={(item) => {
                                const existingLine = findExistingFeeLine(
                                  fee.streamName,
                                  item.label,
                                );
                                updateLine(feeIndex, lineIndex, {
                                  id: existingLine?.id,
                                  description: item.label,
                                  amount: existingLine?.amount ?? line.amount,
                                });
                              }}
                              onCreate={(value) =>
                                updateLine(feeIndex, lineIndex, {
                                  description: value.trim(),
                                })
                              }
                              renderOnCreate={(value) => (
                                <span>Create description "{value}"</span>
                              )}
                            />
                          </div>
                          <div className="md:w-1/5">
                            {lineIndex === 0 ? <Label>Amount</Label> : null}
                            <NumericFormat
                              customInput={Input}
                              value={line.amount ?? ""}
                              prefix="NGN "
                              placeholder="NGN 0"
                              thousandSeparator
                              onValueChange={(value) =>
                                updateLine(feeIndex, lineIndex, {
                                  amount: value.floatValue ?? null,
                                })
                              }
                            />
                          </div>
                          {fee.lines.length > 1 ? (
                            <div className="flex items-end justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  updateFee(feeIndex, {
                                    lines: fee.lines.filter(
                                      (_line, index) => index !== lineIndex,
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFee(feeIndex, {
                          lines: [
                            ...fee.lines,
                            { description: "", amount: null },
                          ],
                        })
                      }
                    >
                      Add Sub Fee
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFees((current) => [
                  ...current,
                  {
                    streamId: null,
                    streamName: "",
                    required: true,
                    lines: [{ description: "", amount: null }],
                  },
                ])
              }
            >
              Add More Fee
            </Button>
            <div className="flex gap-3">
              <Button asChild variant="ghost">
                <Link href="/onboarding/invite-staff">Skip for now</Link>
              </Button>
              <Button
                type="button"
                onClick={saveFees}
                disabled={createItem.isPending}
              >
                Save and continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/70 bg-[#171410] text-white shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              General fee setup
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              All-class fees live here
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/75">
            <p>
              Use this step for fees that every student should see, like PTA
              levy, exam fee, ID card, or portal access.
            </p>
            <p>
              Class-specific books, uniforms, or tuition can still be set from
              individual classrooms.
            </p>
            <p>
              Internally, all-class fees are saved without classroom scope.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <p className="font-medium">Recommended first fees</p>
            </div>
            <p className="mt-2">
              Start with PTA Levy, Exam Fee, ID Card, or Portal Fee if those
              apply to every class in this term.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import React from "react";
import {
  Plus,
  Calendar,
  TrendingUp,
  History,
  Edit2,
  CheckCircle2,
  Settings,
  ExternalLink,
  Filter,
  Download,
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, Field } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { Form, FormField } from "@school-clerk/ui/form";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { formatDate } from "date-fns";
import Link from "next/link";
import { useAcademicParams } from "@/hooks/use-academic-params";
import { AcademicSessionSheet } from "@/components/sheets/academic-session-sheet";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";

type DashboardTerm =
  RouterOutputs["academics"]["dashboard"]["sessions"][number]["terms"][number];

const toDateInputValue = (value?: Date | string | null) => {
  if (!value) return "";
  return formatDate(new Date(value), "yyyy-MM-dd");
};

const fromDateInputValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const termDateFormSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
  })
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    {
      message: "End date must be after the start date",
      path: ["endDate"],
    },
  );

const Dashboard = () => {
  const { setParams } = useAcademicParams();
  const [expandedSessionId, setExpandedSessionId] = React.useState<
    string | null
  >(null);
  const [termDateModal, setTermDateModal] =
    React.useState<DashboardTerm | null>(null);
  const termDateForm = useZodForm(termDateFormSchema, {
    defaultValues: {
      startDate: "",
      endDate: "",
    },
  });
  const { data: dashboard } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const sessions = dashboard?.sessions || [];
  const promotionIds = dashboard?.promotionIds ?? null;
  const { mutate: saveTermDates, isPending: isSavingTermDates } = useMutation(
    _trpc.academics.saveTermMetaData.mutationOptions({
      onSuccess() {
        setTermDateModal(null);
        _qc?.invalidateQueries({
          queryKey: _trpc.academics.dashboard.queryKey({}),
        });
      },
      meta: {
        toastTitle: {
          error: "Unable to update term",
          loading: "Updating term...",
          success: "Term updated.",
        },
      },
    }),
  );

  const openTermDateModal = (term: DashboardTerm) => {
    setTermDateModal(term);
    termDateForm.reset({
      startDate: toDateInputValue(term.startDate),
      endDate: toDateInputValue(term.endDate),
    });
  };

  const submitTermDates = termDateForm.handleSubmit((data) => {
    if (!termDateModal) return;

    saveTermDates({
      termId: termDateModal.id,
      startDate: fromDateInputValue(data.startDate),
      endDate: data.endDate ? fromDateInputValue(data.endDate) : null,
    });
  });

  return (
    <div className="animate-in fade-in duration-500">
      <PageTitle>Academic Management</PageTitle>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Academic Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure and monitor your school's annual calendars and term
            breakdowns.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 font-bold"
            onClick={() => setParams({ academicSessionFormType: "term" })}
          >
            <Plus className="h-5 w-5" />
            Create New Term
          </Button>
          <Button
            className="gap-2 font-bold shadow-md shadow-primary/20"
            onClick={() => setParams({ academicSessionFormType: "session" })}
          >
            <Calendar className="h-5 w-5" />
            Create New Session
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card.Root className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-muted-foreground">
              Current Session Status
            </span>
            <Badge variant="success">ACTIVE</Badge>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">
              2023/2024 Academic Year
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-bold uppercase">In Progress</span>
          </div>
        </Card.Root>

        <Card className="p-6 flex flex-col gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Total Terms Created
          </span>
          <p className="text-2xl font-bold tracking-tight">12 Terms Recorded</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            <span className="text-xs font-medium">Across 4 years</span>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Days Remaining (2nd Term)
          </span>
          <p className="text-2xl font-bold tracking-tight">45 Days Left</p>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-1">
            <div className="bg-primary h-1.5 rounded-full w-[65%]"></div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <h3 className="font-bold text-lg">Academic Sessions History</h3>
          <div className="flex items-center gap-3">
            <button className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter
            </button>
            <span className="text-border">|</span>
            <button className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
              <Download className="h-3 w-3" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Session Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Active Term
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions?.map((session) => (
                <React.Fragment key={session.id}>
                  <tr
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedSessionId(
                        session.id === expandedSessionId ? null : session.id,
                      )
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {expandedSessionId === session.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div
                          className={`w-2 h-2 rounded-full ${session.status === "current" ? "bg-primary" : session.status === "archived" ? "bg-gray-300" : "bg-yellow-400"}`}
                        ></div>
                        <span className="font-semibold">{session.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge
                        variant={
                          session.status === "current"
                            ? "default"
                            : session.status === "archived"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {session.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      {session.currentTerm ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {session.currentTerm.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {/* Mid-term Break */}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-medium ${session.status === "planning" ? "italic text-muted-foreground" : ""}`}
                        >
                          {session.activeTerm}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {session.duration}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {session.status === "archived" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {session.status === "current" && promotionIds && (
                              <Link
                                href={`/academic/progression/${promotionIds.lastTermId}/${session.currentTerm?.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 text-primary font-semibold px-2"
                                >
                                  <ArrowUpCircle className="h-4 w-4" />
                                  Progress
                                </Button>
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedSessionId === session.id && (
                    <>
                      <tr className="bg-muted/20">
                        <td colSpan={5} className="px-6 py-6 lg:px-10">
                          {session.terms.length ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                              {session.terms.map((term) => (
                                <Card
                                  key={term.id}
                                  className="p-4 relative overflow-hidden bg-card/50"
                                >
                                  <div className="absolute top-2 right-2 opacity-10">
                                    <CheckCircle2 className="h-12 w-12" />
                                  </div>
                                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                    {term.title}
                                  </p>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {!term.startDate
                                          ? ""
                                          : formatDate(
                                              term.startDate || new Date(),
                                              "MMM dd, yyyy",
                                            )}
                                        {" - "}
                                        {!term.endDate
                                          ? ""
                                          : formatDate(
                                              term.endDate,
                                              "MMM dd, yyyy",
                                            )}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wide">
                                      {term.status}
                                    </span>
                                  </div>
                                  <div className="mt-4 flex items-center gap-3">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-0 text-[11px] text-primary font-bold hover:bg-transparent hover:underline"
                                      onClick={() => openTermDateModal(term)}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      Dates
                                    </Button>
                                    <Link
                                      href={`/academic/term-getting-started/${term.id}`}
                                      className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                                    >
                                      <Settings className="h-3 w-3" /> Configure
                                    </Link>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="animate-in slide-in-from-top-2 duration-200 rounded-lg border border-dashed border-border bg-card/50 px-5 py-6 text-sm text-muted-foreground">
                              No terms have been created for this session yet.
                            </div>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <p>Showing 3 academic sessions</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-5 w-5 text-primary">ℹ️</div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300">
              Quick Configuration Tip
            </h4>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
            Setting start and end dates accurately for terms will automatically
            calculate attendance percentages and report card generation periods.
          </p>
        </div>
        <Card className="p-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold mb-1">Session Roll-over</h4>
            <p className="text-xs text-muted-foreground">
              Prepare for the upcoming academic session by copying data.
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary font-bold hover:bg-transparent hover:underline px-0"
            onClick={() => setParams({ academicSessionFormType: "session" })}
          >
            Start Roll-over Wizard →
          </Button>
        </Card>
      </div>

      <AcademicSessionSheet />
      <Dialog
        open={!!termDateModal}
        onOpenChange={(open) => {
          if (!open) setTermDateModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <Form {...termDateForm}>
            <form onSubmit={submitTermDates} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>Quick Term Update</DialogTitle>
                <DialogDescription>
                  Update the start and end dates for {termDateModal?.title}.
                </DialogDescription>
              </DialogHeader>
              <Field.Group className="gap-4">
                <FormField
                  control={termDateForm.control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <Field.Label htmlFor="term-start-date">
                        Start date
                      </Field.Label>
                      <Input
                        id="term-start-date"
                        type="date"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                      <Field.Error errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <FormField
                  control={termDateForm.control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <Field.Label htmlFor="term-end-date">
                        End date
                      </Field.Label>
                      <Input
                        id="term-end-date"
                        type="date"
                        min={termDateForm.watch("startDate") || undefined}
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                      <Field.Error errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </Field.Group>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTermDateModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSavingTermDates || !termDateForm.watch("startDate")
                  }
                >
                  {isSavingTermDates ? "Saving..." : "Save dates"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

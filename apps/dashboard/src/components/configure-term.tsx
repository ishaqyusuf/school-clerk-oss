"use client";
import React, { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Lock,
  Info,
  ArrowRight,
  Database,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { Card } from "@school-clerk/ui/composite";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Button } from "@school-clerk/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
export const ConfigureTerm = ({ termId }) => {
  const { mutate: saveAndProceed, isPending: isSaving } = useMutation(
    _trpc.academics.saveTermMetaData.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );

  const { data: dashboardData } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const schema = z.object({
    id: z.string(),
    startDate: z.string(),
    title: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  });
  const form = useZodForm(schema, {
    defaultValues: {
      id: undefined,
      startDate: undefined as any,
      endDate: undefined as any,
      title: "",
    },
  });
  useEffect(() => {
    if (dashboardData && termId) {
      const term = dashboardData
        .map((a) =>
          a.terms.map((t) => ({
            ...t,
          })),
        )
        .flat()
        .find((t) => t.id === termId);
      form.reset({
        id: term.id,
        startDate: term.startDate,
        endDate: term.endDate,
        title: term.title,
      });
    }
  }, [dashboardData, termId]);
  const formData = form.watch();
  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        saveAndProceed({
          termId: data.id,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
        });
      })}
    >
      <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            //   onClick={onBack}
            className="hover:text-primary transition-colors"
          >
            Academic Management - {termId}
          </button>
          <span>/</span>
          <span className="font-semibold text-foreground">
            Configure Next Term
          </span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Configure {formData.title || "Next Term"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Prepare the upcoming academic period for the 2023/2024 session.
          </p>
        </div>

        {/* Info Alert Box */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6 flex flex-col md:flex-row gap-6">
          <div className="flex gap-4 flex-1">
            <div className="h-10 w-10 shrink-0 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-300">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">
                Current Term in Progress: 2nd Term
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                The current term must be completed and closed before the 3rd
                Term can be officially activated. You can still configure the
                next term settings as a draft.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-4 border border-blue-100 dark:border-blue-800 min-w-[160px]">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                Term Countdown
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-900 dark:text-white">
                  12
                </span>
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  days remaining
                </span>
              </div>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-4 border border-blue-100 dark:border-blue-800 min-w-[180px]">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                Pending Tasks
              </p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="h-6 w-6 rounded-full bg-green-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white">
                    <CheckCircle className="h-3 w-3" />
                  </span>
                  <span className="h-6 w-6 rounded-full bg-yellow-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                    !
                  </span>
                  <span className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                    3
                  </span>
                </div>
                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  Grades pending
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Configuration Card */}
        <Card className="overflow-hidden border-border">
          <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
            <h2 className="font-bold text-lg">Term Configuration</h2>
            <Badge
              variant="neutral"
              className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-wider text-[10px]"
            >
              Draft Mode
            </Badge>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormDate
                control={form.control}
                name="startDate"
                label="Term Start Date"
                // disabled
                description="Students will be able to log in from this date."
              />
              <FormDate
                control={form.control}
                name="endDate"
                label="Term End Date"
                // disabled
                description="End of academic activities for this term."
              />
              <FormInput
                control={form.control}
                name="note"
                type="textarea"
                placeholder="e.g. Focus on external examinations and final projects..."
                label={"Term Objective/Notes"}
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 flex items-center gap-3">
              <Lock className="text-amber-600 dark:text-amber-500 h-5 w-5" />
              <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                Fields are locked while the current term is active.
                Configuration will unlock once 2nd Term is closed.
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                //   onClick={onBack}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-background"
                >
                  Save as Draft
                </Button>
                <Button
                  // disabled
                  className="gap-2 bg-primary/50 text-primary-foreground hover:bg-primary/50"
                >
                  Next: Data Migration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="font-bold mb-3 flex items-center gap-2 text-foreground">
              <Database className="text-primary h-5 w-5" />
              Data Migration Preview
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              When you proceed to the next step, the system will automatically
              prepare to roll over the following data:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle className="text-green-500 h-4 w-4" />
                Student Enrollment Records
              </li>
              <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle className="text-green-500 h-4 w-4" />
                Staff Course Allocations
              </li>
              <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle className="text-green-500 h-4 w-4" />
                Timetable Templates
              </li>
            </ul>
          </Card>

          <Card className="p-6 flex flex-col justify-center items-center text-center">
            <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mb-3 text-foreground">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h4 className="font-bold mb-1 text-foreground">Need assistance?</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Our support team can help you with the term transition process.
            </p>
            <Button variant="secondary" className="w-full">
              Contact Support
            </Button>
          </Card>
        </div>

        {/* Spacer */}
        <div className="h-8"></div>
      </div>
    </form>
  );
};

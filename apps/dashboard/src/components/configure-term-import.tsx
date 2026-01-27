"use client";
import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  LayoutTemplate,
  BookOpen,
  Users,
} from "lucide-react";
import { Card } from "@school-clerk/ui/card";
import { Switch } from "@school-clerk/ui/switch";
import { Button } from "@school-clerk/ui/button";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { FieldSet } from "@school-clerk/ui/field";
import { Field, Item } from "@school-clerk/ui/composite";
import { RadioGroup, RadioGroupItem } from "@school-clerk/ui/radio-group";
import { _trpc } from "./static-trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Label } from "@school-clerk/ui/label";

interface DataMigrationProps {
  //   onBack: () => void;
  //   onNext: () => void;
  termId: string;
}
const schema = z.object({
  classroomOption: z.enum(["copy-all", "select", "empty"]),
  subjectOption: z.enum(["copy-all", "select", "empty"]),
  studentOption: z.enum(["copy-all", "select", "empty"]),
  autoPromote: z.boolean(),
});
export const ConfigureTermImport: React.FC<DataMigrationProps> = ({
  termId,
}) => {
  const form = useZodForm(schema, {
    defaultValues: {
      classroomOption: "copy-all",
      subjectOption: "select",
      studentOption: "copy-all",
      autoPromote: true,
    },
  });
  const { data: migrationStat } = useQuery(
    _trpc.academics.getTermImportStat.queryOptions({ termId }),
  );
  const {
    classroomOption: classroomOpt,
    subjectOption: subjectOpt,
    studentOption: studentOpt,
    autoPromote,
  } = form.watch();

  const { mutate: migrateTermData, isPending: isMigrating } = useMutation(
    _trpc.academics.migrateTermData.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {
        console.error("Migration error:", error);
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );
  const startImport = () => {
    migrateTermData({
      termId,
      classroomOption: classroomOpt,
      subjectOption: subjectOpt,
      studentOption: studentOpt,
      autoPromote: autoPromote,
      sessionId: migrationStat?.sessionId!,
      previousTermId: migrationStat?.previousTerm?.id!,
    });
  };
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto w-full">
      {/* Progress Header */}
      <div className="mb-8 max-w-4xl">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          New Term Wizard - Data Migration from{" "}
          {`${migrationStat?.previousTerm?.session?.title} ${migrationStat?.previousTerm?.title}`}
        </h1>
        <p className="text-muted-foreground mt-2">
          Transition your academic data from the previous term to the new one.
        </p>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">
              Step 2 of 3: Data Migration
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              66% Complete
            </span>
          </div>
          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3 rounded-full"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Almost there! Configure how your data transfers to the Spring 2024
            term.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 w-full space-y-6">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Migration Settings
          </h2>

          {/* Classrooms Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <LayoutTemplate className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Classrooms
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage physical and virtual space assignments.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Controller
                control={form.control}
                name="classroomOption"
                render={({ field, fieldState }) => (
                  <FieldSet
                    data-invalid={
                      form.formState.errors.classroomOption ? true : false
                    }
                  >
                    <Field.Legend>Classrooms Import Options</Field.Legend>
                    <Field.Description>
                      Choose how to handle classroom data for the new term.
                    </Field.Description>
                    <RadioGroup
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    >
                      {classroomImportOptions.map((plan) => (
                        <Field.Label
                          key={plan.id}
                          htmlFor={`form-rhf-radiogroup-${plan.id}`}
                        >
                          <Field
                            orientation="horizontal"
                            data-invalid={fieldState.invalid}
                          >
                            <Field.Content>
                              <Field.Title>{plan.title}</Field.Title>
                              <Field.Description>{plan.desc}</Field.Description>
                            </Field.Content>
                            <RadioGroupItem
                              value={plan.id}
                              id={`form-rhf-radiogroup-${plan.id}`}
                              aria-invalid={fieldState.invalid}
                            />
                          </Field>
                        </Field.Label>
                      ))}
                    </RadioGroup>
                  </FieldSet>
                )}
              />
            </div>
          </Card>

          {/* Subjects Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Subjects & Curriculum
                </h3>
                <p className="text-sm text-muted-foreground">
                  Courses, syllabus, and learning materials.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Controller
                control={form.control}
                name="classroomOption"
                render={({ field, fieldState }) => (
                  <FieldSet
                    data-invalid={
                      form.formState.errors.classroomOption ? true : false
                    }
                  >
                    <Field.Legend>Classrooms Import Options</Field.Legend>
                    <Field.Description>
                      Choose how to handle classroom data for the new term.
                    </Field.Description>
                    <RadioGroup
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    >
                      {subjectImportOptions.map((plan) => (
                        <Field.Label
                          key={plan.id}
                          htmlFor={`form-rhf-radiogroup-${plan.id}`}
                        >
                          <Field
                            orientation="horizontal"
                            data-invalid={fieldState.invalid}
                          >
                            <Field.Content>
                              <Field.Title>{plan.title}</Field.Title>
                              <Field.Description>{plan.desc}</Field.Description>
                            </Field.Content>
                            <RadioGroupItem
                              value={plan.id}
                              id={`form-rhf-radiogroup-${plan.id}`}
                              aria-invalid={fieldState.invalid}
                            />
                          </Field>
                        </Field.Label>
                      ))}
                    </RadioGroup>
                  </FieldSet>
                )}
              />
            </div>
          </Card>

          {/* Student Enrollment Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Student Enrollment
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Migration of student records and grade levels.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase text-primary mb-1">
                  Feature
                </span>
                <div className="flex items-center gap-2">
                  <Controller
                    control={form.control}
                    name="autoPromote"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <span className="text-sm font-medium">Auto-Promote</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Controller
                control={form.control}
                name="classroomOption"
                render={({ field, fieldState }) => (
                  <FieldSet
                    data-invalid={
                      form.formState.errors.classroomOption ? true : false
                    }
                  >
                    <Field.Legend>Classrooms Import Options</Field.Legend>
                    <Field.Description>
                      Choose how to handle classroom data for the new term.
                    </Field.Description>
                    <RadioGroup
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    >
                      {studentImportOptions.map((plan) => (
                        <Field.Label
                          key={plan.id}
                          htmlFor={`form-rhf-radiogroup-${plan.id}`}
                        >
                          <Field
                            orientation="horizontal"
                            data-invalid={fieldState.invalid}
                          >
                            <Field.Content>
                              <Field.Title>{plan.title}</Field.Title>
                              <Field.Description>{plan.desc}</Field.Description>
                            </Field.Content>
                            <RadioGroupItem
                              value={plan.id}
                              id={`form-rhf-radiogroup-${plan.id}`}
                              aria-invalid={fieldState.invalid}
                            />
                          </Field>
                        </Field.Label>
                      ))}
                    </RadioGroup>
                  </FieldSet>
                )}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-6 sticky top-6">
          <Card className="overflow-hidden border-border shadow-sm">
            <div className="p-6 border-b border-border bg-card">
              <h3 className="text-lg font-bold text-foreground">
                Migration Summary
              </h3>
              <p className="text-xs text-muted-foreground">
                Updates live as you select
              </p>
            </div>
            <div className="space-y-6 bg-card">
              <Item.Group>
                <Item>
                  <Item.Content>
                    <Item.Title className="">Classroom</Item.Title>
                    <Item.Description className="">
                      Full migration
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Label>{migrationStat?.classrooms || 0} items</Label>
                  </Item.Actions>
                </Item>
                <Item.Separator />
                <Item>
                  <Item.Content>
                    <Item.Title className="">Subjects</Item.Title>
                    <Item.Description className="">
                      {subjectOpt === "copy-all"
                        ? "Full migration"
                        : subjectOpt === "select"
                          ? "Granular selection"
                          : "None"}
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Label>{migrationStat?.subjects || 0} items</Label>
                  </Item.Actions>
                </Item>
                <Item.Separator />
                <Item>
                  <Item.Content>
                    <Item.Title className="">Students</Item.Title>
                    <Item.Description className="">
                      {studentOpt === "copy-all"
                        ? `All ${autoPromote ? "+ Auto-promote" : ""}`
                        : "Manual entry"}
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Label>{migrationStat?.students || 0} items</Label>
                  </Item.Actions>
                </Item>
              </Item.Group>

              <div className="pt-6 border-t border-border">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg mb-6 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Info className="h-4 w-4" />
                    <p className="text-[10px] font-bold uppercase tracking-wide">
                      Validation Status
                    </p>
                  </div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Ready for migration. No conflicts detected.
                  </p>
                </div>

                <Button
                  onClick={startImport}
                  className="w-full gap-2 font-bold shadow-lg"
                >
                  {/* Continue to Review
                  <ArrowRight className="h-4 w-4" /> */}
                  Start Import
                </Button>
                {/* <Button
                  variant="outline"
                  className="w-full mt-3 font-bold text-muted-foreground"
                >
                  Save as Draft
                </Button> */}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-12 flex justify-between items-center py-6 border-t border-border">
        <button className="flex items-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back: General Info
        </button>
        <div className="hidden sm:block text-xs text-muted-foreground">
          Step 2 of 3
        </div>
      </div>
    </div>
  );
};

const subjectImportOptions = [
  {
    id: "copy-all",
    title: "Copy All from Previous Term",
    desc: "Full curriculum for all 120 departments.",
  },
  {
    id: "select",
    title: "Select Specific Items to Copy",
    desc: "85 subjects currently selected in configuration list.",
  },
  {
    id: "empty",
    title: "Start with Empty Data",
    desc: "Manually define new curriculum for this term.",
  },
];
const studentImportOptions = [
  {
    id: "copy-all",
    title: "Copy All from Previous Term",
    desc: "Transfer all 1,240 active students.",
  },
  {
    id: "select",
    title: "Select Specific Items to Copy",
    desc: "Pick specific students or grades manually.",
  },
  {
    id: "empty",
    title: "Start with Empty Data",
    desc: "Wait for new registrations or external sync.",
  },
];
const classroomImportOptions = [
  {
    id: "copy-all",
    title: "Copy All from Previous Term",
    desc: "Includes all 42 physical rooms and 15 virtual labs.",
  },
  {
    id: "select",
    title: "Select Specific Items to Copy",
    desc: "Pick specific buildings or room types manually.",
  },
  {
    id: "empty",
    title: "Start with Empty Data",
    desc: "Clear all records and start fresh for this term.",
  },
];
const MigrationOption = ({
  id,
  title,
  desc,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
      checked
        ? "border-primary bg-primary/5 shadow-sm"
        : "border-border hover:bg-muted/50"
    }`}
  >
    <div className="relative flex items-center justify-center">
      <input
        type="radio"
        id={id}
        name={id.split("-")[0]}
        checked={checked}
        onChange={onChange}
        className="peer appearance-none w-4 h-4 rounded-full border-2 border-muted-foreground checked:border-primary transition-all"
      />
      <div
        className={`absolute w-2 h-2 rounded-full bg-primary scale-0 transition-transform ${checked ? "scale-100" : ""}`}
      ></div>
    </div>
    <div className="flex-1">
      <p
        className={`font-semibold text-sm ${checked ? "text-primary" : "text-foreground"}`}
      >
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  </label>
);

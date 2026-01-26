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

interface DataMigrationProps {
  //   onBack: () => void;
  //   onNext: () => void;
  termId: string;
}

export const ConfigureTermImport: React.FC<DataMigrationProps> = ({
  termId,
}) => {
  const [classroomOpt, setClassroomOpt] = useState("copy-all");
  const [subjectOpt, setSubjectOpt] = useState("select");
  const [studentOpt, setStudentOpt] = useState("copy-all");
  const [autoPromote, setAutoPromote] = useState(true);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto w-full">
      {/* Progress Header */}
      <div className="mb-8 max-w-4xl">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          New Term Wizard
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
              <MigrationOption
                id="class-copy"
                title="Copy All from Previous Term"
                desc="Includes all 42 physical rooms and 15 virtual labs."
                checked={classroomOpt === "copy-all"}
                onChange={() => setClassroomOpt("copy-all")}
              />
              <MigrationOption
                id="class-select"
                title="Select Specific Items to Copy"
                desc="Pick specific buildings or room types manually."
                checked={classroomOpt === "select"}
                onChange={() => setClassroomOpt("select")}
              />
              <MigrationOption
                id="class-empty"
                title="Start with Empty Data"
                desc="Clear all records and start fresh for this term."
                checked={classroomOpt === "empty"}
                onChange={() => setClassroomOpt("empty")}
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
              <MigrationOption
                id="subj-copy"
                title="Copy All from Previous Term"
                desc="Full curriculum for all 120 departments."
                checked={subjectOpt === "copy-all"}
                onChange={() => setSubjectOpt("copy-all")}
              />
              <MigrationOption
                id="subj-select"
                title="Select Specific Items to Copy"
                desc="85 subjects currently selected in configuration list."
                checked={subjectOpt === "select"}
                onChange={() => setSubjectOpt("select")}
              />
              <MigrationOption
                id="subj-empty"
                title="Start with Empty Data"
                desc="Manually define new curriculum for this term."
                checked={subjectOpt === "empty"}
                onChange={() => setSubjectOpt("empty")}
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
                  <Switch
                    checked={autoPromote}
                    onChange={() => setAutoPromote(!autoPromote)}
                  />
                  <span className="text-sm font-medium">Auto-Promote</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <MigrationOption
                id="stud-copy"
                title="Copy All from Previous Term"
                desc="Transfer all 1,240 active students."
                checked={studentOpt === "copy-all"}
                onChange={() => setStudentOpt("copy-all")}
              />
              <MigrationOption
                id="stud-select"
                title="Select Specific Items to Copy"
                desc="Pick specific students or grades manually."
                checked={studentOpt === "select"}
                onChange={() => setStudentOpt("select")}
              />
              <MigrationOption
                id="stud-empty"
                title="Start with Empty Data"
                desc="Wait for new registrations or external sync."
                checked={studentOpt === "empty"}
                onChange={() => setStudentOpt("empty")}
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
            <div className="p-6 space-y-6 bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Classrooms
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {classroomOpt === "copy-all"
                      ? "Full migration"
                      : classroomOpt === "select"
                        ? "Partial selection"
                        : "None"}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {classroomOpt === "copy-all"
                    ? "57 Items"
                    : classroomOpt === "select"
                      ? "12 Items"
                      : "0 Items"}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Subjects
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subjectOpt === "copy-all"
                      ? "Full migration"
                      : subjectOpt === "select"
                        ? "Granular selection"
                        : "None"}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {subjectOpt === "copy-all"
                    ? "120 Items"
                    : subjectOpt === "select"
                      ? "85 Items"
                      : "0 Items"}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Students
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {studentOpt === "copy-all"
                      ? `All ${autoPromote ? "+ Auto-promote" : ""}`
                      : "Manual entry"}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {studentOpt === "copy-all" ? "1,240 Items" : "0 Items"}
                </span>
              </div>

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

                <Button className="w-full gap-2 font-bold shadow-lg">
                  Continue to Review
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-3 font-bold text-muted-foreground"
                >
                  Save as Draft
                </Button>
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

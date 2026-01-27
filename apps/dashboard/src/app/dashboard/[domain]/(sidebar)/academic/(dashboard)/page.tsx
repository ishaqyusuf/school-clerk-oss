"use client";
import React from "react";
import {
  Plus,
  Calendar,
  TrendingUp,
  History,
  MoreVertical,
  Edit2,
  CheckCircle2,
  Hourglass,
  Settings,
  ExternalLink,
  Filter,
  Download,
} from "lucide-react";
import { Card } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { formatDate } from "date-fns";
import Link from "next/link";

interface DashboardProps {
  onNavigate: (page: "details") => void;
  onOpenModal: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenModal }) => {
  const { mutate: patchCreateMissingTermSession, isPending: isPatching } =
    useMutation(
      _trpc.academics.patchCreateMissingTermSession.mutationOptions({
        onSuccess(data, variables, onMutateResult, context) {},
        onError(error, variables, onMutateResult, context) {},
        meta: {
          toastTitle: {
            // show:true,
            error: "Unable to complete",
            loading: "Processing...",
            success: "Done!.",
          },
        },
      }),
    );
  // We'll expand the first session by default for the demo effect
  const [expandedSessionId, setExpandedSessionId] = React.useState<
    string | null
  >("2023-2024");
  const { data: dashboard, isPending } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const sessions = dashboard?.sessions || [];
  return (
    <div className="animate-in fade-in duration-500">
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
            onClick={onOpenModal}
          >
            <Plus className="h-5 w-5" />
            Create New Term
          </Button>
          <Button
            className="gap-2 font-bold shadow-md shadow-primary/20"
            onClick={onOpenModal}
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
                      session.status === "planning"
                        ? onNavigate("details")
                        : setExpandedSessionId(
                            session.id === expandedSessionId
                              ? null
                              : session.id,
                          )
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
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
                                onNavigate("details");
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {session.status === "current" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Row for Current Session */}
                  {expandedSessionId === session.id &&
                    session.status === "current" && (
                      <>
                        <tr className="bg-muted/20">
                          <td colSpan={5} className="px-6 py-6 lg:px-10">
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
                                  <Link
                                    href={`/academic/term-getting-started/${term.id}`}
                                    className="mt-4 text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                                  >
                                    <Settings className="h-3 w-3" /> Configure
                                  </Link>
                                </Card>
                              ))}
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-muted/20">
                          <td colSpan={5} className="px-6 py-6 lg:px-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                              {/* Term 1 */}
                              <Card className="p-4 relative overflow-hidden bg-card/50">
                                <div className="absolute top-2 right-2 opacity-10">
                                  <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                  1st Term
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>Sep 04 - Dec 15, 2023</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 mt-1">
                                    <CheckCircle2 className="h-3 w-3" />{" "}
                                    Completed
                                  </div>
                                </div>
                                <button className="mt-4 text-[11px] text-primary font-bold flex items-center gap-1 hover:underline">
                                  <History className="h-3 w-3" /> View Results
                                </button>
                              </Card>

                              {/* Term 2 (Active) */}
                              <Card className="p-4 relative overflow-hidden ring-2 ring-primary/20 bg-card">
                                <div className="absolute top-2 right-2 text-primary/10">
                                  <Hourglass className="h-12 w-12" />
                                </div>
                                <p className="text-xs font-bold text-primary uppercase mb-2">
                                  2nd Term (Active)
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>Jan 08 - Apr 12, 2024</span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-1 mt-2">
                                    <div className="bg-primary h-1 rounded-full w-3/4"></div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => onNavigate("details")}
                                  className="mt-4 text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit Dates
                                </button>
                              </Card>

                              {/* Term 3 */}
                              <Card className="p-4 relative overflow-hidden opacity-75 bg-card/50">
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                  3rd Term
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>May 06 - Jul 26, 2024</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wide">
                                    Upcoming
                                  </span>
                                </div>
                                <Link
                                  href={`/academic/term-getting-started/1`}
                                  className="mt-4 text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                                >
                                  <Settings className="h-3 w-3" /> Configure
                                </Link>
                              </Card>
                            </div>
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
          >
            Start Roll-over Wizard →
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

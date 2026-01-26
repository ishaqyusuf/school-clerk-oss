import React from "react";
import {
  ArrowLeft,
  Download,
  Calendar,
  Wand2,
  Bell,
  Save,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@school-clerk/ui/button";
import { Card } from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import { Switch } from "@school-clerk/ui/switch";

const SessionDetails = ({}) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8 max-w-5xl mx-auto">
      {/* Top Navigation / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <button
            // onClick={onBack}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Academic Sessions
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="hover:text-primary cursor-pointer">
            2024/2025 Session
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Manage Dates</span>
        </nav>
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <Button className="gap-2 shadow-sm font-bold">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Page Title & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Academic Session: 2024/2025
          </h1>
          <p className="text-muted-foreground text-base">
            Configure dates and active status for school terms across the entire
            session.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 font-bold bg-background">
            <Download className="h-4 w-4" />
            Export Calendar
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col justify-center">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            Session Duration
          </p>
          <p className="text-2xl font-bold tracking-tight">285 Days</p>
        </Card>
        <Card className="p-6 flex flex-col justify-center">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            Current Status
          </p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200 dark:shadow-none"></span>
            <p className="text-2xl font-bold tracking-tight">In Progress</p>
          </div>
        </Card>
        <Card className="p-6 flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            Active Term
          </p>
          <p className="text-2xl font-bold text-primary tracking-tight">
            1st Term
          </p>
        </Card>
      </div>

      {/* Session Date Range Card */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground">
          <Calendar className="text-primary h-5 w-5" />
          Session Date Range
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Session Start Date
            </label>
            <div className="relative">
              <Input
                type="date"
                defaultValue="2024-09-04"
                className="pl-10 h-11"
              />
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Session End Date
            </label>
            <div className="relative">
              <Input
                type="date"
                defaultValue="2025-07-15"
                className="pl-10 h-11"
              />
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Terms Schedule */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Term Schedule</h2>
          <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline transition-all">
            <Wand2 className="h-4 w-4" />
            Auto-calculate terms
          </button>
        </div>

        {/* Term 1 (Active) */}
        <Card className="overflow-hidden border-2 border-primary shadow-md">
          <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                1
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  1st Term (First Term)
                </h3>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground mt-1 shadow-sm">
                  CURRENTLY ACTIVE
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Set Active
              </span>
              <Switch checked={true} onChange={() => {}} />
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                defaultValue="2024-09-04"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                End Date
              </label>
              <Input
                type="date"
                defaultValue="2024-12-18"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mid-term Break (Start)
              </label>
              <Input
                type="date"
                defaultValue="2024-10-24"
                className="bg-background"
              />
            </div>
          </div>
        </Card>

        {/* Term 2 */}
        <Card className="overflow-hidden opacity-90 hover:opacity-100 transition-all shadow-sm hover:shadow-md">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-foreground font-bold border border-border">
                2
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  2nd Term (Easter Term)
                </h3>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground mt-1 uppercase tracking-wide">
                  Upcoming
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Set Active
              </span>
              <Switch checked={false} onChange={() => {}} />
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                defaultValue="2025-01-08"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                End Date
              </label>
              <Input
                type="date"
                defaultValue="2025-04-04"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mid-term Break (Start)
              </label>
              <Input
                type="date"
                defaultValue="2025-02-14"
                className="bg-background"
              />
            </div>
          </div>
        </Card>

        {/* Term 3 */}
        <Card className="overflow-hidden opacity-90 hover:opacity-100 transition-all shadow-sm hover:shadow-md">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-foreground font-bold border border-border">
                3
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  3rd Term (Summer Term)
                </h3>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground mt-1 uppercase tracking-wide">
                  Upcoming
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Set Active
              </span>
              <Switch checked={false} onChange={() => {}} />
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                defaultValue="2025-04-23"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                End Date
              </label>
              <Input
                type="date"
                defaultValue="2025-07-15"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mid-term Break (Start)
              </label>
              <Input
                type="date"
                defaultValue="2025-06-05"
                className="bg-background"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 mb-12">
        <Button
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold px-4 h-10 w-full sm:w-auto justify-start sm:justify-center"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete This Session
        </Button>
        <div className="flex gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            className="px-6 font-bold h-10 w-full sm:w-auto"
            // onClick={onBack}
          >
            Cancel
          </Button>
          <Button
            className="px-8 font-bold shadow-md h-10 w-full sm:w-auto"
            // onClick={onBack}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;

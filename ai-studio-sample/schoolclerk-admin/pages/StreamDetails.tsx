
import React from 'react';
import { 
    ArrowLeft, Download, Plus, ChevronLeft, ChevronRight, Search, 
    Bell, MoreVertical, TrendingUp, AlertCircle, Bus, Users, Filter,
    CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

interface StreamDetailsProps {
    streamId: string;
    onBack: () => void;
    onRecordPayment: () => void;
    onOpenTransfer: () => void;
}

export const StreamDetails: React.FC<StreamDetailsProps> = ({ streamId, onBack, onRecordPayment }) => {
    // If we are on the 'operations' stream, we render the specialized Service Account layout.
    // For other streams, we could render a generic layout, but for this demo, 
    // we'll focus on the requested Services Account design.
    
    const isServicesStream = streamId === 'operations';
    const title = isServicesStream ? 'Services Account' : 'Stream Details';

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            {/* Top Navbar Area - Typically handled by App shell, but adding specific Breadcrumbs here */}
            <div className="flex flex-col gap-6">
                {/* Header & Controls */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-primary">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                Live
                            </span>
                        </div>
                        <p className="text-muted-foreground">Manage transactions and statements for school services.</p>
                    </div>

                    {/* Term Context Switcher & Actions */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        <div className="flex items-center bg-card rounded-lg border border-border p-1 shadow-sm">
                            <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-2 text-sm font-semibold text-foreground border-x border-border min-w-[180px] text-center">
                                Session 2023/24 - T2
                            </span>
                            <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2 bg-card">
                                <Download className="h-5 w-5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                            <Button className="gap-2 shadow-md hover:bg-primary/90" onClick={onRecordPayment}>
                                <Plus className="h-5 w-5" />
                                <span>Record Transaction</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Revenue */}
                    <Card className="p-5 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                            <div className="p-1 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">$45,200.00</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" /> 12% vs last term
                        </p>
                    </Card>

                    {/* Outstanding */}
                    <Card className="p-5 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                            <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">$3,400.00</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" /> 5 overdue invoices
                        </p>
                    </Card>

                    {/* Popular Service */}
                    <Card className="p-5 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Top Service</p>
                            <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Bus className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">School Bus</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                            45% of total service revenue
                        </p>
                    </Card>

                    {/* Students Served */}
                    <Card className="p-5 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Students Served</p>
                            <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">142</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" /> +8% enrollment
                        </p>
                    </Card>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <input 
                            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                            placeholder="Search by student, ID, or receipt..." 
                            type="text"
                        />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                        <select className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary min-w-[140px] cursor-pointer">
                            <option>All Services</option>
                            <option>Transport</option>
                            <option>Music Lessons</option>
                            <option>After School Care</option>
                            <option>Catering</option>
                        </select>
                        <select className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary min-w-[140px] cursor-pointer">
                            <option>All Statuses</option>
                            <option>Paid</option>
                            <option>Unpaid</option>
                            <option>Partial</option>
                        </select>
                        <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap">
                            <Filter className="h-5 w-5" />
                            More Filters
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <Card className="overflow-hidden border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Receipt #</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Service Details</th>
                                    <th className="px-6 py-4">Staff</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {/* Row 1 */}
                                <tr className="hover:bg-muted/30 transition-colors group">
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        Oct 24, 2023
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-primary">
                                        RCP-2023-009
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="h-8 w-8 rounded-full bg-slate-200 bg-cover bg-center border border-border" 
                                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAYrdQrtMJ7BiCvusbuh5O771Hcemm3UgW_Ghr-nTpvcDWeEvrUdVagAGfzbZvFPcYjpW9DzrDl6Gi06qZf3HQjK9VTznpJ2fETgNwuP3tkG8YnB5zF7r4d3tAV9gfCFikLdnAi5wKPmlZykmCaOIiVwJ0V3ml90EaWgnt0gSv4Tnq1JgWMxdV5kGf9FXdbxlBQs2Zhei6uLcUiEgfTOJDZKTfF44mwDzFh_wYvw4fCMOtufWjtcqqBabdQszJo-riO2pGzMxSLKLA')" }}
                                            ></div>
                                            <div>
                                                <div className="font-medium text-foreground">Alex Johnson</div>
                                                <div className="text-xs text-muted-foreground">Grade 5-B</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-foreground">School Bus - Route A</div>
                                        <div className="text-xs text-muted-foreground">Monthly Pass (Oct)</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        <a href="#" className="hover:text-primary hover:underline">Mr. Anderson</a>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-foreground">
                                        $150.00
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <Badge variant="success">Paid</Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                                {/* Row 2 */}
                                <tr className="hover:bg-muted/30 transition-colors group">
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        Oct 23, 2023
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-primary">
                                        RCP-2023-008
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xs border border-pink-200 dark:border-pink-800">
                                                EM
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Emma Miller</div>
                                                <div className="text-xs text-muted-foreground">Grade 3-A</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-foreground">Piano Lessons</div>
                                        <div className="text-xs text-muted-foreground">Private Session (1hr)</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        <a href="#" className="hover:text-primary hover:underline">Ms. Sarah Lee</a>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-foreground">
                                        $65.00
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                            Unpaid
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                                {/* Row 3 */}
                                <tr className="hover:bg-muted/30 transition-colors group">
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        Oct 22, 2023
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-primary">
                                        RCP-2023-007
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800">
                                                LJ
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Liam James</div>
                                                <div className="text-xs text-muted-foreground">Grade 6-C</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-foreground">Catering Plan</div>
                                        <div className="text-xs text-muted-foreground">Weekly Lunch (Standard)</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        <span className="text-muted-foreground/50 italic">--</span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-foreground">
                                        $45.00
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                                            Partial
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                                {/* Row 4 */}
                                <tr className="hover:bg-muted/30 transition-colors group">
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        Oct 20, 2023
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-primary">
                                        RCP-2023-006
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-200 dark:border-purple-800">
                                                SD
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Sophia Davis</div>
                                                <div className="text-xs text-muted-foreground">Grade 4-A</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-foreground">Robotics Club</div>
                                        <div className="text-xs text-muted-foreground">Term Fee</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                        <a href="#" className="hover:text-primary hover:underline">Mr. Tech</a>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-foreground">
                                        $120.00
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <Badge variant="success">Paid</Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">1-4</span> of <span className="font-medium text-foreground">142</span> results
                        </div>
                        <div className="flex gap-2">
                            <button 
                                className="rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors" 
                                disabled
                            >
                                Previous
                            </button>
                            <button 
                                className="rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

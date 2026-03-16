
import React from 'react';
import { 
    Home, ChevronRight, Download, PlusCircle, TrendingUp, 
    AlertTriangle, Clock, Calendar, Search, MoreVertical,
    Wallet, DollarSign
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

interface RemunerationOverviewProps {
    onNavigate: (page: string) => void;
}

export const RemunerationOverview: React.FC<RemunerationOverviewProps> = ({ onNavigate }) => {
    return (
        <div className="animate-in fade-in duration-500 max-w-[1280px] mx-auto">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <span className="text-muted-foreground hover:text-primary cursor-pointer">Dashboard</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold text-foreground">Staff Remuneration</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Staff Remuneration</h1>
                    <p className="text-muted-foreground">Manage and track school-wide payroll, service payments, and wages for the 2023 Fall Term.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 bg-background">
                        <Download className="h-[18px] w-[18px]" /> 
                        Export Report
                    </Button>
                    <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => onNavigate('staff-payment-entry')}>
                        <PlusCircle className="h-[18px] w-[18px]" /> 
                        Apply Service Payment
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Payroll (Current Term)</p>
                        <Wallet className="text-primary h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">$124,500.00</p>
                    <p className="text-emerald-600 text-xs font-bold flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1" /> +2.4% from last term
                    </p>
                </Card>

                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-muted-foreground">Unpaid Wages</p>
                        <AlertTriangle className="text-amber-500 h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">$12,340.00</p>
                    <p className="text-emerald-600 text-xs font-bold flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1" /> +1.2% this month
                    </p>
                </Card>

                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-muted-foreground">Service Payments</p>
                        <Clock className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">18 Pending</p>
                    <p className="text-rose-600 text-xs font-bold flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1 rotate-180" /> -5.0% from last week
                    </p>
                </Card>

                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-muted-foreground">Next Pay Date</p>
                        <Calendar className="text-primary h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">Oct 28, 2023</p>
                    <p className="text-muted-foreground text-xs font-bold">Bi-weekly schedule</p>
                </Card>
            </div>

            {/* Content Area */}
            <Card className="overflow-hidden shadow-sm border-border">
                {/* Tabs Interface */}
                <div className="flex border-b border-border px-6 gap-8">
                    <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-3 pt-5 font-bold text-sm tracking-wide">
                        Fixed Salaries
                    </button>
                    <button 
                        className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-muted-foreground pb-3 pt-5 font-bold text-sm tracking-wide hover:text-foreground transition-colors"
                        onClick={() => onNavigate('variable-wages')}
                    >
                        Variable Wages/Services
                    </button>
                </div>

                {/* Filters & Search Bar */}
                <div className="p-6 flex flex-wrap gap-4 items-center justify-between bg-muted/20">
                    <div className="flex flex-1 min-w-[300px] gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <input 
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:ring-primary focus:border-primary outline-none focus:ring-2 focus:ring-offset-0" 
                                placeholder="Search by name or employee ID..." 
                                type="text"
                            />
                        </div>
                        <select className="rounded-lg border border-border bg-background text-sm py-2 px-3 text-muted-foreground focus:ring-primary focus:border-primary outline-none focus:ring-2 cursor-pointer">
                            <option>All Departments</option>
                            <option>Administration</option>
                            <option>Science Dept.</option>
                            <option>Mathematics</option>
                            <option>Facilities</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Displaying:</span>
                        <span className="text-sm font-bold text-foreground">48 Staff Members</span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Staff Name & Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Base Salary</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Additions</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Deductions</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Net Pay</th>
                                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {/* Row 1 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">SM</div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Sarah Mitchell</p>
                                            <p className="text-xs text-muted-foreground">Senior Lecturer - Science</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-foreground">$5,200.00</td>
                                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-medium">+$450.00</td>
                                <td className="px-6 py-4 text-sm text-right text-rose-500">-$210.00</td>
                                <td className="px-6 py-4 text-sm text-right font-extrabold text-foreground">$5,440.00</td>
                                <td className="px-6 py-4 text-center">
                                    <Badge variant="success">Paid</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                            {/* Row 2 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">DB</div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">David Byrne</p>
                                            <p className="text-xs text-muted-foreground">Head of Administration</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-foreground">$6,800.00</td>
                                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-medium">+$0.00</td>
                                <td className="px-6 py-4 text-sm text-right text-rose-500">-$450.00</td>
                                <td className="px-6 py-4 text-sm text-right font-extrabold text-foreground">$6,350.00</td>
                                <td className="px-6 py-4 text-center">
                                    <Badge variant="warning">Pending</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                            {/* Row 3 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-xs">RK</div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Robert King</p>
                                            <p className="text-xs text-muted-foreground">Math Instructor</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-foreground">$4,500.00</td>
                                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-medium">+$1,200.00</td>
                                <td className="px-6 py-4 text-sm text-right text-rose-500">-$150.00</td>
                                <td className="px-6 py-4 text-sm text-right font-extrabold text-foreground">$5,550.00</td>
                                <td className="px-6 py-4 text-center">
                                    <Badge variant="success">Paid</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                            {/* Row 4 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs">EL</div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Elena Lopez</p>
                                            <p className="text-xs text-muted-foreground">Librarian</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-foreground">$3,800.00</td>
                                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-medium">+$0.00</td>
                                <td className="px-6 py-4 text-sm text-right text-rose-500">-$80.00</td>
                                <td className="px-6 py-4 text-sm text-right font-extrabold text-foreground">$3,720.00</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 uppercase tracking-wide">Overdue</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Showing 1-10 of 48 members</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" disabled className="h-8 w-8">
                            <ChevronRight className="h-[18px] w-[18px] rotate-180" />
                        </Button>
                        <Button className="h-8 w-8 p-0 bg-primary text-primary-foreground text-xs">1</Button>
                        <Button variant="outline" className="h-8 w-8 p-0 text-xs">2</Button>
                        <Button variant="outline" className="h-8 w-8 p-0 text-xs">3</Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-[18px] w-[18px]" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};


import React, { useState } from 'react';
import { 
    History, CheckCircle, TrendingUp, Users, Activity, 
    FileText, Check, Download, Printer, Filter, X, Eye, 
    MoreVertical
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

export const PayrollProcessing = () => {
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <div className="flex flex-wrap gap-2 py-2 text-sm">
                    <span className="text-muted-foreground hover:text-primary cursor-pointer">Payroll</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium text-foreground">May 2024 Processing</span>
                </div>
                <div className="flex flex-wrap justify-between items-end gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">Payroll - May 2024</h1>
                        <p className="text-muted-foreground text-base">Review salaries, verify taxes, and finalize disbursements for 84 active staff members.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2 bg-background h-11 px-5">
                            <History className="h-[18px] w-[18px]" />
                            Previous Month
                        </Button>
                        <Button className="gap-2 shadow-md h-11 px-6">
                            <CheckCircle className="h-[18px] w-[18px]" />
                            Confirm & Process Payment
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-muted-foreground text-sm font-medium">Total Net Pay</p>
                        <div className="text-primary"><Activity className="h-5 w-5" /></div>
                    </div>
                    <p className="text-3xl font-bold leading-tight tracking-tight text-foreground">$142,500.00</p>
                    <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        +4.2% vs last month
                    </p>
                </Card>
                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-muted-foreground text-sm font-medium">Staff Count</p>
                        <div className="text-primary"><Users className="h-5 w-5" /></div>
                    </div>
                    <p className="text-3xl font-bold leading-tight tracking-tight text-foreground">84 Staff</p>
                    <p className="text-muted-foreground text-sm font-medium">0 headcount change</p>
                </Card>
                <Card className="p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-muted-foreground text-sm font-medium">Processing Progress</p>
                        <div className="text-primary"><Activity className="h-5 w-5" /></div>
                    </div>
                    <p className="text-3xl font-bold leading-tight tracking-tight text-foreground">92%</p>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-1">
                        <div className="bg-primary h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                </Card>
            </div>

            {/* Actions Toolbar */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="bg-secondary/50 hover:bg-primary/10 hover:text-primary gap-2 h-9 text-sm font-semibold">
                        <FileText className="h-[18px] w-[18px]" />
                        Bulk Generate Payslips
                    </Button>
                    <Button variant="ghost" className="bg-secondary/50 hover:bg-secondary gap-2 h-9 text-sm font-semibold">
                        <Check className="h-[18px] w-[18px]" />
                        Verify All Records
                    </Button>
                    <Button variant="ghost" className="bg-secondary/50 hover:bg-secondary gap-2 h-9 text-sm font-semibold">
                        <Download className="h-[18px] w-[18px]" />
                        Export CSV
                    </Button>
                    <Button variant="ghost" className="bg-secondary/50 hover:bg-secondary gap-2 h-9 text-sm font-semibold">
                        <Printer className="h-[18px] w-[18px]" />
                        Print All
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Filter by:</span>
                    <select className="h-9 rounded-lg border border-border bg-background text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20">
                        <option>All Departments</option>
                        <option>Teaching Faculty</option>
                        <option>Administration</option>
                        <option>Maintenance</option>
                    </select>
                </div>
            </div>

            {/* Payroll Table */}
            <Card className="overflow-hidden shadow-sm border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/40 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Member</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gross Pay</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Deductions</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Pay</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {/* Row 1 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-cover border border-border" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC02u8qVvCfYKwo-ANnljmjrTwAc4UC8H79380QdTpZQK7-qOxxtt9TLTV1cKZ4xXKVlVx0PDyzS9IgvFVsKgR4ukuuYT8ntgBxGpMnlTNusfLp1lMZJph2PA3xCAZGJagaAwyjbrLkWth15e5IBUfOsY2aVRpmm56aWw0pp-0uI-4pDdHGN6cPPhQy6S5tbYZb2hY77nTptUSbIA0jJZpNNaqubGbUtWlzNvzVCKmpw7yVRCVj_HCYV4La6nJYVt1wN_PNZbKSNgY')" }}></div>
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">Dr. Sarah Jenkins</p>
                                            <p className="text-xs text-muted-foreground">EMP-2024-001</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">Senior Principal</td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">$5,200.00</td>
                                <td className="px-6 py-4 text-sm text-rose-500">-$840.00</td>
                                <td className="px-6 py-4 text-sm font-bold text-foreground">$4,360.00</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">Calculated</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button className="p-2 hover:bg-muted rounded-lg text-primary transition-colors" title="Preview Payslip" onClick={() => setIsPayslipOpen(true)}>
                                            <Eye className="h-[18px] w-[18px]" />
                                        </button>
                                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                                            <MoreVertical className="h-[18px] w-[18px]" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 2 */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-cover border border-border" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCHG01_kp4QGfIfDWqLuAaE4Qj30r0E-rzNZxuXJyo8EMigSypsuGh-f2H9u-2vgyQGtlQQ9QgK3PP1CHYbXVZ_jTWBvJcpwZudTaHrPGZlWAzgapl48QFbzHBpkM17TjlBaM7K249EKCbCD6Xoz2pgIBXlAV1PLDDMNFpVWwQtGGTyqih-CgpAclwP8Dxul5Bhv-AhjTMcNqdVWpdC1ENeKnUV7Ptqakj2xHZjbx7V6NJjcOA3MGsx82lK58NNbowWH4-4-lgH56o')" }}></div>
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">Michael Thorne</p>
                                            <p className="text-xs text-muted-foreground">EMP-2024-042</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">Math Dept Head</td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">$4,500.00</td>
                                <td className="px-6 py-4 text-sm text-rose-500">-$620.00</td>
                                <td className="px-6 py-4 text-sm font-bold text-foreground">$3,880.00</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">Verified</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button className="p-2 hover:bg-muted rounded-lg text-primary transition-colors" title="Preview Payslip" onClick={() => setIsPayslipOpen(true)}>
                                            <Eye className="h-[18px] w-[18px]" />
                                        </button>
                                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                                            <MoreVertical className="h-[18px] w-[18px]" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Payslip Modal */}
            {isPayslipOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsPayslipOpen(false)}>
                    <Card className="w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border-none" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
                            <h3 className="font-bold text-lg text-foreground">Payslip Preview - May 2024</h3>
                            <div className="flex gap-2">
                                <Button variant="secondary" className="h-8 gap-2 text-xs font-bold">
                                    <Printer className="h-4 w-4" /> Print
                                </Button>
                                <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground" onClick={() => setIsPayslipOpen(false)}>
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto bg-muted/20">
                            <div className="bg-card p-8 shadow-sm border border-border max-w-2xl mx-auto space-y-8">
                                <div className="flex justify-between items-start border-b-2 border-primary pb-4">
                                    <div>
                                        <h4 className="text-xl font-black text-primary">ST. PETERS ACADEMY</h4>
                                        <p className="text-xs text-muted-foreground">123 Education Lane, Science Park, 50001</p>
                                        <p className="text-xs text-muted-foreground">Contact: +1 234 567 890</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-foreground">PAYSLIP</p>
                                        <p className="text-sm font-medium text-foreground">Month: May 2024</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium">Employee Details</p>
                                        <p className="font-bold text-foreground">Dr. Sarah Jenkins</p>
                                        <p className="text-foreground">Senior Principal</p>
                                        <p className="text-foreground">EMP-2024-001</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-muted-foreground font-medium">Payment Info</p>
                                        <p className="text-foreground">Bank: Global Trust Bank</p>
                                        <p className="text-foreground">A/C: **** **** 1234</p>
                                        <p className="text-foreground">Date: May 28, 2024</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <table className="w-full text-sm">
                                        <thead className="border-y border-border bg-muted/30">
                                            <tr>
                                                <th className="py-2 text-left px-2 font-semibold text-foreground">Earnings Breakdown</th>
                                                <th className="py-2 text-right px-2 font-semibold text-foreground">Amount ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            <tr><td className="py-2 px-2 text-foreground">Basic Salary</td><td className="py-2 px-2 text-right text-foreground">4,200.00</td></tr>
                                            <tr><td className="py-2 px-2 text-foreground">House Rent Allowance (HRA)</td><td className="py-2 px-2 text-right text-foreground">600.00</td></tr>
                                            <tr><td className="py-2 px-2 text-foreground">Conveyance Allowance</td><td className="py-2 px-2 text-right text-foreground">300.00</td></tr>
                                            <tr className="font-semibold bg-muted/10"><td className="py-2 px-2 text-foreground">Gross Total</td><td className="py-2 px-2 text-right text-foreground">5,200.00</td></tr>
                                        </tbody>
                                    </table>
                                    <table className="w-full text-sm">
                                        <thead className="border-y border-border bg-muted/30">
                                            <tr>
                                                <th className="py-2 text-left px-2 font-semibold text-foreground">Deductions & Taxes</th>
                                                <th className="py-2 text-right px-2 font-semibold text-foreground">Amount ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            <tr><td className="py-2 px-2 text-foreground">Income Tax (TDS)</td><td className="py-2 px-2 text-right text-rose-500">520.00</td></tr>
                                            <tr><td className="py-2 px-2 text-foreground">Provident Fund (PF)</td><td className="py-2 px-2 text-right text-rose-500">280.00</td></tr>
                                            <tr><td className="py-2 px-2 text-foreground">Professional Tax</td><td className="py-2 px-2 text-right text-rose-500">40.00</td></tr>
                                            <tr className="font-semibold bg-muted/10"><td className="py-2 px-2 text-foreground">Total Deductions</td><td className="py-2 px-2 text-right text-rose-500">840.00</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-primary/5 p-6 rounded-lg flex justify-between items-center border border-primary/20">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Net Salary Payable</p>
                                        <p className="text-xs italic text-muted-foreground">(Four thousand three hundred and sixty dollars only)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-primary">$4,360.00</p>
                                    </div>
                                </div>
                                <div className="pt-12 flex justify-between items-end">
                                    <div className="text-center w-40">
                                        <div className="border-t border-muted-foreground/30 pt-1 text-[10px] text-muted-foreground">Employer Signature</div>
                                    </div>
                                    <div className="text-center w-40">
                                        <div className="border-t border-muted-foreground/30 pt-1 text-[10px] text-muted-foreground">Employee Signature</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

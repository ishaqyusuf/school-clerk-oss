
import React from 'react';
import { ChevronRight, Upload, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';

interface StaffPaymentEntryProps {
    onBack: () => void;
}

export const StaffPaymentEntry: React.FC<StaffPaymentEntryProps> = ({ onBack }) => {
    return (
        <div className="animate-in fade-in duration-500 flex flex-col items-center py-8 px-4 w-full">
            <div className="w-full max-w-[800px] flex flex-col gap-6">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button className="text-muted-foreground hover:text-primary transition-colors" onClick={onBack}>Payments</button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">New Entry</span>
                </div>

                {/* Page Heading */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Staff Service Payment Entry</h1>
                    <p className="text-muted-foreground">Record wages or special service payments for teachers and administration staff.</p>
                </div>

                {/* Main Form Card */}
                <Card className="overflow-hidden border border-border shadow-sm bg-card">
                    <div className="p-6 md:p-8 space-y-8">
                        {/* Section: Staff Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Staff Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Staff Member</label>
                                    <div className="relative">
                                        <select className="w-full rounded-lg border border-border bg-background h-12 px-4 focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all appearance-none outline-none">
                                            <option value="">Search by name or ID...</option>
                                            <option value="1">John Doe (STF-001)</option>
                                            <option value="2">Jane Smith (STF-002)</option>
                                            <option value="3">Robert Wilson (STF-003)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Payment Date</label>
                                    <div className="relative">
                                        <Input className="h-12" type="date" defaultValue="2023-11-20" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Service Details */}
                        <div className="space-y-4 pt-6 border-t border-border">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Service Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Service Type</label>
                                    <select className="w-full rounded-lg border border-border bg-background h-12 px-4 focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all appearance-none outline-none">
                                        <option value="">Select type...</option>
                                        <option value="workshop">Workshop Facilitation</option>
                                        <option value="extra">Extra-curricular Activity</option>
                                        <option value="hourly">Standard Hourly Wage</option>
                                        <option value="overtime">Overtime Bonus</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Payment Method</label>
                                    <select className="w-full rounded-lg border border-border bg-background h-12 px-4 focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all appearance-none outline-none">
                                        <option value="bank">Bank Transfer</option>
                                        <option value="cash">Cash</option>
                                        <option value="check">Check</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Rate ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                        <Input className="h-12 pl-8" placeholder="0.00" type="number" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Quantity / Hours</label>
                                    <Input className="h-12" placeholder="0" type="number" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground">Total Amount</label>
                                    <div className="flex items-center h-12 px-4 bg-primary/5 rounded-lg border border-primary/20 text-primary font-bold text-lg">
                                        $0.00
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Supporting Documents */}
                        <div className="space-y-4 pt-6 border-t border-border">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Supporting Documents</h3>
                            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/30 hover:border-primary/50 transition-colors cursor-pointer">
                                <div className="h-12 w-12 bg-background rounded-full flex items-center justify-center shadow-sm text-primary">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground mt-1">Timesheets, receipts or invoices (PDF, JPG up to 10MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 pt-6">
                            <Button variant="outline" className="h-12 px-6" onClick={onBack}>Cancel</Button>
                            <Button className="h-12 px-6 gap-2 shadow-lg shadow-primary/20" onClick={onBack}>
                                <CheckCircle2 className="h-5 w-5" />
                                Record Payment
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Helper Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Card className="p-4 flex flex-col gap-2 border-border bg-card">
                        <div className="text-primary"><CheckCircle2 className="h-5 w-5" /></div>
                        <p className="text-sm font-bold">Auto-Calculation</p>
                        <p className="text-xs text-muted-foreground">Total amount is derived from Rate x Quantity. This value is read-only.</p>
                    </Card>
                    <Card className="p-4 flex flex-col gap-2 border-border bg-card">
                        <div className="text-primary"><CheckCircle2 className="h-5 w-5" /></div>
                        <p className="text-sm font-bold">Recent Entries</p>
                        <p className="text-xs text-muted-foreground">View and edit your recently submitted payments in the Dashboard.</p>
                    </Card>
                    <Card className="p-4 flex flex-col gap-2 border-border bg-card">
                        <div className="text-primary"><CheckCircle2 className="h-5 w-5" /></div>
                        <p className="text-sm font-bold">Audit Log</p>
                        <p className="text-xs text-muted-foreground">Every payment entry is timestamped and linked to your administrator profile.</p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

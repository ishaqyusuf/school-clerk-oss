import React from 'react';
import { X, Calendar, Search, Wand2, CheckCircle2, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from './ui';

interface RecordPaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RecordPaymentSheet: React.FC<RecordPaymentSheetProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="h-full w-full max-w-[700px] flex flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none px-6 py-5 border-b border-border bg-card flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">Apply Student Payment</h2>
                        <p className="text-muted-foreground text-sm font-medium mt-1 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Session 2023/2024 - Term 2
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Student Selection */}
                    <section className="space-y-4">
                        <label className="block text-sm font-semibold">Select Student</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input 
                                className="block w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow shadow-sm" 
                                placeholder="Search by name, admission no, or class..." 
                                type="text" 
                                defaultValue="John Doe"
                            />
                        </div>
                        
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-border shadow-sm" 
                                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC8JVNQJ5BCEGp30K9qnrzffR5TAWjnKLwtIBDndBkoPAKYLXBgvP-iHDKlWHhll5MxJaNQOS8XDnXNbPPcduQr9wCvLt1VYJ8df3SQfPfVGlMpn9aTa_hCWQoILxYiYPvI_L5NNPKptsBhDYdNGV3wRMqXqpb9aCpqESpYBV42Ba_VQmwHrBADvlmoHJYa_pNY-IgegrsBTKCMB4rMn5PbvgD5ELcc4qkysCILy-7UQ45SYO1OGX5jkXrGF4HzW2hzM1OrNK4a1bE')" }}
                                ></div>
                                <div>
                                    <h3 className="font-bold text-lg">John Doe</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-xs font-medium">Grade 5 - Gold</span>
                                        <span>•</span>
                                        <span>ID: #882910</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end pl-4 sm:border-l border-border w-full sm:w-auto">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Outstanding</span>
                                <span className="text-destructive font-bold text-xl tracking-tight">$1,250.00</span>
                            </div>
                        </div>
                    </section>

                    {/* Payment Details */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Payment Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Amount Received</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground font-medium">$</span>
                                    <input className="block w-full rounded-lg border border-border bg-card pl-7 pr-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" placeholder="0.00" type="number" defaultValue="500.00"/>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
                                <input className="block w-full rounded-lg border border-border bg-card px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" type="date" defaultValue="2023-10-24"/>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                                <select className="block w-full rounded-lg border border-border bg-card px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm">
                                    <option>Bank Transfer</option>
                                    <option>Cash</option>
                                    <option>POS / Card</option>
                                    <option>Cheque</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Reference / Receipt No.</label>
                                <input className="block w-full rounded-lg border border-border bg-card px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" placeholder="e.g. TRX-00123" type="text" defaultValue="TRX-882910"/>
                            </div>
                        </div>
                    </section>

                    {/* Allocation */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Allocate Funds</h3>
                            <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 transition-colors">
                                <Wand2 className="h-4 w-4" />
                                Auto-Allocate
                            </button>
                        </div>
                        
                        <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3 text-right">Outstanding</th>
                                        <th className="px-4 py-3 text-right w-[160px]">Allocate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <span>Tuition Fee - Term 2</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Due Oct 1st</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground font-medium tabular-nums">$1,000.00</td>
                                        <td className="px-4 py-2">
                                            <input className="block w-full text-right rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium tabular-nums" type="text" defaultValue="300.00"/>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <span>Uniform Set (Complete)</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Store Item</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground font-medium tabular-nums">$250.00</td>
                                        <td className="px-4 py-2">
                                            <input className="block w-full text-right rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium tabular-nums" type="text" defaultValue="200.00"/>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <span>School Bus Service</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Route B</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground font-medium tabular-nums">$0.00</td>
                                        <td className="px-4 py-2">
                                            <input className="block w-full text-right rounded-md border border-border bg-muted/50 px-2 py-1.5 text-muted-foreground text-sm font-medium tabular-nums cursor-not-allowed" disabled type="text" defaultValue="0.00"/>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot className="bg-primary/5 border-t border-primary/20">
                                    <tr>
                                        <td className="px-4 py-3 text-sm font-semibold text-primary">Allocation Summary</td>
                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">Total Allocated:</td>
                                        <td className="px-4 py-3 text-right font-bold tabular-nums">$500.00</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
                            <CheckCircle2 className="h-4 w-4 mt-0.5" />
                            <p>Perfect match. The allocated amount ($500.00) matches the amount received.</p>
                        </div>
                    </section>
                    
                    <div className="h-10"></div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary" type="checkbox"/>
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Generate & Print Receipt</span>
                    </label>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                        <Button className="flex-1 sm:flex-none gap-2 font-bold shadow-md" onClick={onClose}>
                            <CreditCard className="h-4 w-4" />
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
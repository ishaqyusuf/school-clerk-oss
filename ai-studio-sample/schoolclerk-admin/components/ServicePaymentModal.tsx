
import React from 'react';
import { X, Calendar, DollarSign, ChevronDown, CreditCard, Banknote, Receipt, User, Info } from 'lucide-react';
import { Card } from './ui';

interface ServicePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ServicePaymentModal: React.FC<ServicePaymentModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card 
                className="relative w-full max-w-[640px] flex flex-col max-h-[90vh] bg-background shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="flex flex-col px-6 pt-6 pb-4 border-b border-border shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight leading-tight text-foreground">Record Service Payment</h2>
                            <div className="flex items-center mt-1.5 gap-2">
                                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                                    Session: 2023/2024
                                </span>
                                <span className="text-muted-foreground/40">|</span>
                                <span className="text-muted-foreground text-sm font-normal">Term: Second</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
                        {/* Service Description */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                Service Name / Description
                            </label>
                            <input 
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm" 
                                placeholder="e.g., Generator Maintenance, Plumbing Repair" 
                                type="text"
                            />
                        </div>

                        {/* Amount & Date Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                        <DollarSign className="h-4 w-4" />
                                    </span>
                                    <input 
                                        className="flex h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary shadow-sm" 
                                        placeholder="0.00" 
                                        type="number"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Transaction Date
                                </label>
                                <div className="relative">
                                    <input 
                                        className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary shadow-sm" 
                                        type="date" 
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-5 w-5" />
                                </div>
                            </div>
                        </div>

                        {/* Category & Ref Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Category
                                </label>
                                <div className="relative">
                                    <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary shadow-sm appearance-none cursor-pointer">
                                        <option disabled selected value="">Select Category</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="transport">Transport</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="wages">Wages & Stipends</option>
                                        <option value="miscellaneous">Miscellaneous</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-5 w-5" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Reference / Receipt # <span className="text-muted-foreground font-normal">(Optional)</span>
                                </label>
                                <input 
                                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary shadow-sm" 
                                    placeholder="e.g., REF-10239" 
                                    type="text"
                                />
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-medium leading-none text-foreground">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="cursor-pointer">
                                    <input type="radio" name="payment-method" className="peer sr-only" defaultChecked />
                                    <div className="rounded-lg border border-input bg-background p-3 hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all text-center flex flex-col items-center justify-center gap-1">
                                        <Banknote className="h-5 w-5" />
                                        <span className="text-xs font-medium">Cash</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" name="payment-method" className="peer sr-only" />
                                    <div className="rounded-lg border border-input bg-background p-3 hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all text-center flex flex-col items-center justify-center gap-1">
                                        <CreditCard className="h-5 w-5" />
                                        <span className="text-xs font-medium">Transfer</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" name="payment-method" className="peer sr-only" />
                                    <div className="rounded-lg border border-input bg-background p-3 hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all text-center flex flex-col items-center justify-center gap-1">
                                        <Receipt className="h-5 w-5" />
                                        <span className="text-xs font-medium">Cheque</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Staff Selection (Optional) */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none text-foreground">
                                Linked Staff <span className="text-muted-foreground font-normal">(Optional for wages)</span>
                            </label>
                            <div className="relative">
                                <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary shadow-sm appearance-none cursor-pointer">
                                    <option disabled selected value="">Search or select staff member...</option>
                                    <option value="staff-001">Mr. John Doe (Cleaner)</option>
                                    <option value="staff-002">Ms. Sarah Smith (Guest Lecturer)</option>
                                    <option value="staff-003">Mr. James Bond (Security)</option>
                                </select>
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-5 w-5" />
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground border border-border">
                            <Info className="h-5 w-5 text-primary mt-0.5" />
                            <p>This transaction will be recorded under the <strong>Second Term</strong> accounts and cannot be modified after 24 hours.</p>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/20 border-t border-border shrink-0">
                    <button 
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        onClick={onClose}
                    >
                        Record Transaction
                    </button>
                </div>
            </Card>
        </div>
    );
};

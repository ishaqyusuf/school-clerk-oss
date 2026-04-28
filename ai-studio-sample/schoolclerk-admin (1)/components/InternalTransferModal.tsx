import React from 'react';
import { X, ArrowRightLeft, Calendar } from 'lucide-react';
import { Button, Input, Card } from './ui';

interface InternalTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InternalTransferModal: React.FC<InternalTransferModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card 
                className="w-full max-w-[500px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Internal Transfer</h2>
                            <p className="text-xs text-muted-foreground">Move funds between accounts</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* From -> To Visual */}
                    <div className="relative flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-center justify-between gap-2">
                            <div className="w-[45%] space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Source Account</label>
                                <select className="w-full h-10 px-2 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none shadow-sm cursor-pointer">
                                    <option>School Fees</option>
                                    <option>Uniforms</option>
                                    <option>Book Store</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground text-right font-medium text-emerald-600">Bal: $84,200</p>
                            </div>
                            
                            <div className="flex flex-col justify-center items-center pt-4 shrink-0">
                                <div className="p-1.5 rounded-full bg-card border border-border text-muted-foreground shadow-sm">
                                    <ArrowRightLeft className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="w-[45%] space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Destination</label>
                                <select className="w-full h-10 px-2 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none shadow-sm cursor-pointer">
                                    <option>Operations</option>
                                    <option>Staff Salary</option>
                                    <option>Main Reserve</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground text-right font-medium">Bal: $13,000</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Transfer Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">$</span>
                                <Input type="number" className="pl-7 h-11 text-lg font-bold" placeholder="0.00" defaultValue="5000.00" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <div className="relative">
                                    <Input type="date" className="pl-9 h-10" defaultValue={new Date().toISOString().split('T')[0]} />
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reference ID</label>
                                <Input placeholder="Auto-generated" disabled className="bg-muted/50 text-muted-foreground h-10" value="TRF-2024-001" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description / Reason</label>
                            <textarea 
                                className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                                placeholder="E.g. Monthly allocation for operations..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-border bg-muted/10 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="shadow-md font-semibold" onClick={onClose}>Complete Transfer</Button>
                </div>
            </Card>
        </div>
    );
};